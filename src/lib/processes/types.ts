import type { Component } from "svelte";

/**
 * Renderer type with generic type parameter
 * Defines a Svelte component that takes the processed data as a prop
 */
export type Renderer<T> = Component<{props: {input: T}}>;

/**
 * Process interface with generic type
 * Defines a process that transforms markdown content into a specific type
 */
export interface Process<T> {
  id: string;
  name: string;
  description: string;
  process: (content: string) => T;
  renderer: Renderer<T>;
}
