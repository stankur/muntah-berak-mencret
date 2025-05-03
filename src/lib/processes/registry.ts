/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Process, AsyncProcess } from './types';

/**
 * Registry for storing and retrieving processes
 */
class ProcessRegistry {
  private syncProcesses: Map<string, Process<any>> = new Map();
  private asyncProcesses: Map<string, AsyncProcess<any>> = new Map();

  /**
   * Register a synchronous process with the registry
   * @param process The process to register
   */
  register<T>(process: Process<T>): void {
    this.syncProcesses.set(process.id, process);
  }

  /**
   * Register an asynchronous process with the registry
   * @param process The async process to register
   */
  registerAsync<T>(process: AsyncProcess<T>): void {
    this.asyncProcesses.set(process.id, process);
  }

  /**
   * Get all registered processes (both sync and async)
   * @returns Array of all registered processes
   */
  getAll(): (Process<any> | AsyncProcess<any>)[] {
    return [
      ...Array.from(this.syncProcesses.values()),
      ...Array.from(this.asyncProcesses.values())
    ];
  }

  /**
   * Get a process by its ID
   * @param id The ID of the process to retrieve
   * @returns The process with the specified ID, or undefined if not found
   */
  getById<T>(id: string): Process<T> | AsyncProcess<T> | undefined {
    return this.syncProcesses.get(id) as Process<T> | undefined || 
           this.asyncProcesses.get(id) as AsyncProcess<T> | undefined;
  }

  /**
   * Check if a process is asynchronous
   * @param id The ID of the process to check
   * @returns True if the process is asynchronous, false otherwise
   */
  isAsync(id: string): boolean {
    return this.asyncProcesses.has(id);
  }
}

// Create and export a singleton instance of the registry
export const processRegistry = new ProcessRegistry();
