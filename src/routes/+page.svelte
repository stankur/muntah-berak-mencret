<script lang="ts">
  let title = '';
  let content = '';

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      alert('Please provide both title and content');
      return;
    }

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('File saved successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
</script>

<h1>Markdown Editor</h1>

<div>
  <label for="title">Title:</label>
  <input id="title" type="text" bind:value={title} />
</div>

<div>
  <label for="content">Content:</label>
  <textarea id="content" bind:value={content} rows="10"></textarea>
</div>

<button class="p-4 bg-blue-400" on:click={handleSave}>Save</button>
