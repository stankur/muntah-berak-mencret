# Active Context: Section Extraction Research Tool

## Current Work Focus
The current focus is on implementing a process registry system for the Section Extraction Research Tool. This allows defining processes that can transform markdown content and registering renderers to display the transformed content. The system enables running processes on multiple content items and viewing the results.

## Recent Changes
- Created the basic project structure using SvelteKit
- Implemented a simple form UI with title input and content textarea
- Added a save button with basic styling
- Created server-side API endpoints for saving, listing, and retrieving content
- Implemented file system operations for creating the persistence directory and saving files
- Added basic validation and error handling
- Set up the memory bank documentation structure
- Implemented a process registry system with TypeScript generics
- Created an identity process that keeps content unchanged
- Added UI for selecting processes and content to process
- Implemented batch processing of multiple content items

## Next Steps
1. **Implement Tagging System**:
   - Add UI for tagging content
   - Extend the server endpoint to handle tags
   - Update file storage to include tag information

2. **Content Listing**:
   - Create a page to list all saved content
   - Implement filtering by tags
   - Add basic search functionality

3. **Content Viewing**:
   - Add a page to view saved content
   - Implement markdown rendering
   - Add navigation between content items

4. **LLM Integration Planning**:
   - Research integration options for LLM processing
   - Design the section extraction algorithm interface
   - Plan the data structure for storing extraction results

## Active Decisions and Considerations

### File Naming and Organization
- Currently using sanitized titles as filenames
- Considering adding unique identifiers to prevent overwriting
- Evaluating folder structure options for organizing content by tags or categories

### Content Format
- Currently saving raw content as markdown
- Considering adding metadata section for tags and other information
- Evaluating structured formats for storing extraction results alongside original content

### UI Enhancement
- Maintaining minimal UI for now
- Planning improvements for usability without adding unnecessary complexity
- Considering feedback mechanisms for successful operations

### Tagging Implementation
- Deciding between simple comma-separated tags or more structured tag management
- Evaluating storage options for tag information (in filename, in content, separate metadata file)
- Considering tag suggestion functionality based on content analysis

## Current Limitations
- No content management features (edit, delete)
- Limited feedback on save operations (simple alerts)
- No content organization beyond basic file saving
- No visualization of section structures
- No integration with LLM processing yet

## Development Environment
- Local development using SvelteKit dev server
- File persistence in local filesystem
- Manual testing of save functionality
