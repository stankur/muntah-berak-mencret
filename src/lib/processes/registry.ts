/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Process } from './types';

/**
 * Registry for storing and retrieving processes
 */
class ProcessRegistry {
  private processes: Map<string, Process<any>> = new Map();

  /**
   * Register a process with the registry
   * @param process The process to register
   */
  register<T>(process: Process<T>): void {
    this.processes.set(process.id, process);
  }

  /**
   * Get all registered processes
   * @returns Array of all registered processes
   */
  getAll(): Process<any>[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get a process by its ID
   * @param id The ID of the process to retrieve
   * @returns The process with the specified ID, or undefined if not found
   */
  getById<T>(id: string): Process<T> | undefined {
    return this.processes.get(id) as Process<T> | undefined;
  }
}

// Create and export a singleton instance of the registry
export const processRegistry = new ProcessRegistry();
