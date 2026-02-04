import * as path from 'path';
import { ExtractedContent } from './ContentExtractor';
import { FileMetadata } from './FileScanner';

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  circularDependencies: CircularDependency[];
  externalDependencies: ExternalDependency[];
}

export interface DependencyNode {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'directory' | 'module';
  language: string;
  exports: string[];
  imports: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'internal' | 'external';
  strength: 'weak' | 'strong';
}

export interface CircularDependency {
  paths: string[];
  length: number;
}

export interface ExternalDependency {
  name: string;
  version?: string;
  usedIn: string[];
  isDevDependency: boolean;
}

export interface ModuleDependency {
  sourceFile: string;
  targetModule: string;
  isInternal: boolean;
  type: 'import' | 'require' | 'dynamic';
}

/**
 * DependencyAnalyzer - Analyzes dependencies between files
 */
export class DependencyAnalyzer {
  private extractedContents: Map<string, ExtractedContent>;
  private rootPath: string;

  constructor(extractedContents: ExtractedContent[], rootPath: string) {
    this.extractedContents = new Map();
    extractedContents.forEach(content => {
      this.extractedContents.set(content.metadata.path, content);
    });
    this.rootPath = rootPath;
  }

  /**
   * Build the dependency graph
   */
  buildDependencyGraph(): DependencyGraph {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const externalDeps: Map<string, ExternalDependency> = new Map();

    // Build nodes
    for (const [filePath, content] of this.extractedContents) {
      nodes.push({
        id: filePath,
        path: filePath,
        name: path.basename(filePath),
        type: 'file',
        language: content.language,
        exports: content.exports?.map(e => e.name) || [],
        imports: content.imports?.map(i => i.module) || [],
      });
    }

    // Build edges and external dependencies
    for (const [filePath, content] of this.extractedContents) {
      const imports = content.imports || [];

      for (const imp of imports) {
        const moduleName = imp.module;
        const isInternal = this.isInternalModule(moduleName);
        const targetPath = this.resolveModulePath(filePath, moduleName);

        if (isInternal && targetPath && this.extractedContents.has(targetPath)) {
          // Internal dependency
          edges.push({
            from: filePath,
            to: targetPath,
            type: 'internal',
            strength: this.calculateEdgeStrength(filePath, targetPath),
          });
        } else if (!isInternal) {
          // External dependency
          const depName = this.getExternalPackageName(moduleName);
          if (depName) {
            const existingDep = externalDeps.get(depName);
            if (existingDep) {
              existingDep.usedIn.push(filePath);
            } else {
              externalDeps.set(depName, {
                name: depName,
                usedIn: [filePath],
                isDevDependency: this.isDevDependency(depName),
              });
            }
          }
        }
      }
    }

    // Detect circular dependencies
    const circularDeps = this.detectCircularDependencies(edges);

    // Convert external dependencies map to array
    const externalDependencies = Array.from(externalDeps.values());

    return {
      nodes,
      edges,
      circularDependencies: circularDeps,
      externalDependencies,
    };
  }

  /**
   * Check if a module is internal
   */
  private isInternalModule(module: string): boolean {
    // Relative imports
    if (module.startsWith('./') || module.startsWith('../')) {
      return true;
    }

    // Absolute imports within the project
    if (module.startsWith('@/') || module.startsWith(this.rootPath)) {
      return true;
    }

    return false;
  }

  /**
   * Resolve module path to file path
   */
  private resolveModulePath(sourceFile: string, module: string): string | null {
    const sourceDir = path.dirname(sourceFile);
    let resolvedPath: string;

    if (module.startsWith('./')) {
      resolvedPath = path.resolve(sourceDir, module);
    } else if (module.startsWith('../')) {
      resolvedPath = path.resolve(sourceDir, module);
    } else if (module.startsWith('@/')) {
      resolvedPath = path.resolve(this.rootPath, module.substring(2));
    } else {
      // Absolute path
      resolvedPath = module;
    }

    // Try to find the file
    const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    
    // Direct file match
    if (this.extractedContents.has(resolvedPath)) {
      return resolvedPath;
    }

    // Try with extensions
    for (const ext of possibleExtensions) {
      const withExt = resolvedPath + ext;
      if (this.extractedContents.has(withExt)) {
        return withExt;
      }
    }

    // Try index file
    for (const ext of possibleExtensions) {
      const indexFile = path.join(resolvedPath, `index${ext}`);
      if (this.extractedContents.has(indexFile)) {
        return indexFile;
      }
    }

    return null;
  }

  /**
   * Get external package name from module path
   */
  private getExternalPackageName(module: string): string | null {
    // Handle scoped packages
    if (module.startsWith('@')) {
      const parts = module.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }

    // Handle regular packages
    const parts = module.split('/');
    if (parts.length >= 1 && parts[0]) {
      // Check if it's a valid package name (starts with letter or @)
      if (/^@?[a-z]/i.test(parts[0])) {
        return parts[0];
      }
    }

    return null;
  }

  /**
   * Check if dependency is a dev dependency
   */
  private isDevDependency(packageName: string): boolean {
    const devDependencies = ['typescript', '@types/', 'eslint', 'prettier', 'jest', 'vitest', 'cypress'];
    return devDependencies.some(dep => packageName.startsWith(dep));
  }

  /**
   * Calculate edge strength based on usage patterns
   */
  private calculateEdgeStrength(from: string, to: string): 'weak' | 'strong' {
    const sourceContent = this.extractedContents.get(from);
    const targetContent = this.extractedContents.get(to);

    if (!sourceContent || !targetContent) {
      return 'weak';
    }

    // Count how many times the target is imported
    const importCount = sourceContent.imports?.filter(i => {
      const resolved = this.resolveModulePath(from, i.module);
      return resolved === to;
    }).length || 0;

    // Check if target exports are used extensively
    const usedExports = sourceContent.imports?.filter(i => {
      const resolved = this.resolveModulePath(from, i.module);
      return resolved === to && i.items && i.items.length > 0;
    }).length || 0;

    // Strong dependency: multiple imports or many exported items used
    if (importCount > 1 || usedExports > 3) {
      return 'strong';
    }

    return 'weak';
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(edges: DependencyEdge[]): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.from)) {
        adjacency.set(edge.from, []);
      }
      adjacency.get(edge.from)!.push(edge.to);
    }

    // DFS to detect cycles
    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cyclePath = path.slice(cycleStart);
          cycles.push({
            paths: [...cyclePath, neighbor],
            length: cyclePath.length,
          });
          return true;
        }
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    };

    for (const node of adjacency.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Get module dependencies
   */
  getModuleDependencies(): ModuleDependency[] {
    const dependencies: ModuleDependency[] = [];

    for (const [filePath, content] of this.extractedContents) {
      const imports = content.imports || [];

      for (const imp of imports) {
        dependencies.push({
          sourceFile: filePath,
          targetModule: imp.module,
          isInternal: this.isInternalModule(imp.module),
          type: imp.isDynamic ? 'dynamic' : 'import',
        });
      }
    }

    return dependencies;
  }

  /**
   * Find files that import a specific file
   */
  findImporters(filePath: string): string[] {
    const importers: string[] = [];

    for (const [sourcePath, content] of this.extractedContents) {
      if (sourcePath === filePath) {
        continue;
      }

      const imports = content.imports || [];
      for (const imp of imports) {
        const resolved = this.resolveModulePath(sourcePath, imp.module);
        if (resolved === filePath) {
          importers.push(sourcePath);
          break;
        }
      }
    }

    return importers;
  }

  /**
   * Find files imported by a specific file
   */
  findDependencies(filePath: string): string[] {
    const dependencies: string[] = [];
    const content = this.extractedContents.get(filePath);

    if (!content) {
      return dependencies;
    }

    const imports = content.imports || [];
    for (const imp of imports) {
      if (this.isInternalModule(imp.module)) {
        const resolved = this.resolveModulePath(filePath, imp.module);
        if (resolved) {
          dependencies.push(resolved);
        }
      }
    }

    return dependencies;
  }

  /**
   * Analyze dependency health
   */
  analyzeDependencyHealth(): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const graph = this.buildDependencyGraph();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check for circular dependencies
    if (graph.circularDependencies.length > 0) {
      issues.push(`${graph.circularDependencies.length} circular dependencies detected`);
      recommendations.push('Refactor to eliminate circular dependencies');
      score -= graph.circularDependencies.length * 10;
    }

    // Check for excessive external dependencies
    if (graph.externalDependencies.length > 50) {
      issues.push(`Too many external dependencies (${graph.externalDependencies.length})`);
      recommendations.push('Consider consolidating or removing unused dependencies');
      score -= 20;
    }

    // Check for duplicate external dependencies
    const depCount = new Map<string, number>();
    graph.externalDependencies.forEach(dep => {
      depCount.set(dep.name, depCount.get(dep.name) || 0 + 1);
    });

    const duplicates = Array.from(depCount.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      issues.push(`${duplicates.length} duplicate dependencies detected`);
      recommendations.push('Use a bundler to deduplicate dependencies');
      score -= duplicates.length * 5;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }
}
