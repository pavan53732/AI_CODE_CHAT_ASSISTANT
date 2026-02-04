'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/indexing/dependencies?projectId={projectId}&filePath={filePath}
 * Get dependencies for a file or project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const filePath = searchParams.get('filePath');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    let dependencies: any[] = [];
    let dependents: any[] = [];

    if (filePath) {
      // Get dependencies for a specific file
      const fileAnalysis = await db.fileAnalysis.findUnique({
        where: { filePath },
      });

      if (!fileAnalysis) {
        return NextResponse.json(
          { error: 'File not found in index' },
          { status: 404 }
        );
      }

      dependencies = fileAnalysis.dependencies ? JSON.parse(fileAnalysis.dependencies) : [];
      dependents = fileAnalysis.dependents ? JSON.parse(fileAnalysis.dependents) : [];

      return NextResponse.json({
        filePath,
        dependencies,
        dependents,
      });
    } else {
      // Get all dependencies for the project
      const fileAnalyses = await db.fileAnalysis.findMany({
        where: { projectId },
        select: {
          filePath: true,
          dependencies: true,
          dependents: true,
        },
      });

      const allDependencies: Map<string, Set<string>> = new Map();
      const allDependents: Map<string, Set<string>> = new Map();

      for (const analysis of fileAnalyses) {
        const deps = analysis.dependencies ? JSON.parse(analysis.dependencies) : [];
        const depsList = Array.isArray(deps) ? deps : [];

        const depsSet = allDependencies.get(analysis.filePath) || new Set();
        depsList.forEach((dep: any) => depsSet.add(dep));
        allDependencies.set(analysis.filePath, depsSet);

        const dependentSet = allDependents.get(analysis.filePath) || new Set();
        depsList.forEach((dep: any) => {
          if (!allDependents.has(dep)) {
            allDependents.set(dep, new Set());
          }
          allDependents.get(dep)!.add(analysis.filePath);
        });
        allDependents.set(analysis.filePath, dependentSet);
      }

      // Convert to arrays
      const dependencyGraph: any[] = [];
      allDependencies.forEach((deps, file) => {
        dependencyGraph.push({
          file,
          dependencies: Array.from(deps),
        });
      });

      const dependentGraph: any[] = [];
      allDependents.forEach((deps, file) => {
        dependentGraph.push({
          file,
          dependents: Array.from(deps),
        });
      });

      return NextResponse.json({
        projectId,
        totalFiles: fileAnalyses.length,
        dependencies: dependencyGraph,
        dependents: dependentGraph,
      });
    }
  } catch (error) {
    console.error('[API /indexing/dependencies] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get dependencies' },
      { status: 500 }
    );
  }
}
