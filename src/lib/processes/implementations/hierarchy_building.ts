import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import buildHierarchy from '$lib/processes/subprocesses/buildHierarchy';
import HierarchyBuildingRenderer from '$lib/processes/renderers/HierarchyBuildingRenderer.svelte';
import type { HierarchyDetectionResult } from '$lib/processes/implementations/hierarchy_detection';

// Define the new types for the hierarchy building process
export type SectionContainer = Section[];

export interface Section {
    heading: string[];
    children: (SectionContainer | string)[];
    directSummary: string[];
}

export interface HierarchyBuildingResult {
    sectionContainer: SectionContainer;
    originalResult: HierarchyDetectionResult;
}

/**
 * Hierarchy Building Process - builds a hierarchical section structure from the hierarchy detection result
 * This process converts the document into a format that represents the hierarchical structure of sections
 */
export const hierarchyBuildingProcess: AsyncProcess<HierarchyBuildingResult> = {
    id: 'hierarchy-building',
    name: 'Hierarchy Building Process',
    description: 'Builds a hierarchical section structure from the hierarchy detection result',
    process: buildHierarchy,
    // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
    renderer: HierarchyBuildingRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(hierarchyBuildingProcess);
