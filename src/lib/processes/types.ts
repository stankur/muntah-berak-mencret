import type { Component } from 'svelte';

/**
 * Renderer type with generic type parameter
 * Defines a Svelte component that takes the processed data as a prop
 */
export type Renderer<T> = Component<{ props: { input: T } }>;

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

/**
 * AsyncProcess interface with generic type
 * Defines a process that asynchronously transforms markdown content into a specific type
 */
export interface AsyncProcess<T> {
	id: string;
	name: string;
	description: string;
	process: (content: string) => Promise<T>;
	renderer: Renderer<T>;
}

export interface ProcessResult<T> {
	title: string;
	content: T;
}
