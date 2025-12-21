<script lang="ts">
    import type DailyNoteViewPlugin from "../dailyNoteViewIndex";
    import { MarkdownView, TAbstractFile, TFile, WorkspaceLeaf, moment } from "obsidian";
    import { spawnLeafView } from "../leafView";
    import { onDestroy, onMount } from "svelte";

    export let file: TAbstractFile;
    export let plugin: DailyNoteViewPlugin;
    export let leaf: WorkspaceLeaf;
    export let shouldRender: boolean = true;
    export let autoFocus: boolean = false;

    let editorEl: HTMLElement;
    let containerEl: HTMLElement;
    let title: string;
    let formattedTitle: string;

    let rendered: boolean = false;

    let createdLeaf: WorkspaceLeaf;
    let unloadTimeout: number | null = null;
    let editorHeight: number = 100; // Default minimum height

    // Track if this component is being destroyed
    let isDestroying = false;

    // Track if the note is collapsed
    let isCollapsed: boolean = false;

    // Format date with ordinal suffix (1st, 2nd, 3rd, etc.)
    function formatDateWithOrdinal(basename: string): string {
        const date = moment(basename, "YYYY-MM-DD", true);
        if (date.isValid()) {
            const day = date.date();
            const suffix = getOrdinalSuffix(day);
            return date.format(`ddd, MMMM D[${suffix}], YYYY`);
        }
        return basename; // Return original if not a valid date
    }

    function getOrdinalSuffix(day: number): string {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    onMount(() => {
        if (file instanceof TFile) {
            title = file.basename;
            formattedTitle = formatDateWithOrdinal(file.basename);
        }
    });

    console.log(shouldRender, rendered)

    $: if (editorEl && shouldRender && !rendered) {
        showEditor();
    } else if (editorEl && !shouldRender && rendered) {
        scheduleUnload();
    }

    onDestroy(() => {
        isDestroying = true;
        if (unloadTimeout) {
            window.clearTimeout(unloadTimeout);
        }
        if (rendered && createdLeaf) {
            unloadEditor();
        }
    });

    function showEditor() {
        if (!(file instanceof TFile)) return;
        if (rendered) return;
        if (isDestroying) return;
        
        // Clear any pending unload
        if (unloadTimeout) {
            window.clearTimeout(unloadTimeout);
            unloadTimeout = null;
        }

        try {
            // Use safe type checking before accessing basename
            const fileName = file instanceof TFile ? file.basename : "unknown";
            console.log(`Loading editor for ${fileName}`);
            
            [createdLeaf] = spawnLeafView(plugin, editorEl, leaf);
            createdLeaf.setPinned(true);

            createdLeaf.setViewState({
                type: "markdown",
                state: {
                    file: file.path,
                    mode: "source",
                    source: false,
                    backlinks: !plugin.settings.hideBacklinks,
                    backlinkOpts: {
                        collapseAll: false,
                        extraContext: false,
                        sortOrder: "alphabetical",
                        showSearch: false,
                        searchQuery: "",
                        backlinkCollapsed: false,
                        unlinkedCollapsed: true
                    }
                }
            });
            createdLeaf.parentLeaf = leaf;

            rendered = true;
            
            // Set a small timeout to allow the editor to render completely
            window.setTimeout(() => {
                if (!createdLeaf || !containerEl) return;
                if (!(createdLeaf.view instanceof MarkdownView)) return;

                // Get the actual height of the editor content
                // @ts-ignore
                const actualHeight = createdLeaf.view.editMode?.editor?.cm?.dom.innerHeight;
                if (actualHeight > 0) {
                    editorHeight = actualHeight;
                    containerEl.style.minHeight = `${editorHeight}px`;
                }

                // Autofocus regardless of height calculation
                if (autoFocus && createdLeaf.view.editor) {
                    const editor = createdLeaf.view.editor;
                    editor.focus();
                    editor.setCursor(editor.lineCount(), 0);
                }
            }, 400);
        } catch (error) {
            console.error("Error creating leaf view:", error);
        }
    }
    
    // Schedule unloading the editor with a delay to prevent flickering
    function scheduleUnload() {
        if (unloadTimeout) {
            window.clearTimeout(unloadTimeout);
        }
        
        // Use a longer timeout to prevent frequent load/unload cycles
        unloadTimeout = window.setTimeout(() => {
            if (!shouldRender && rendered) {
                unloadEditor();
            }
        }, 1000);
    }
    
    // Unload the editor to free up resources
    function unloadEditor() {
        if (!rendered || !createdLeaf) return;
        
        try {
            // Use safe type checking before accessing basename
            const fileName = file instanceof TFile ? file.basename : "unknown";
            console.log(`Unloading editor for ${fileName}`);
            
            // Detach the leaf
            if (createdLeaf.detach) {
                createdLeaf.detach();
            }
            
            // Clear the editor element
            if (editorEl) {
                editorEl.empty();
            }
            
            rendered = false;
            
            // Keep the container height to prevent scroll jumps
            // The height will be maintained by the min-height we set earlier
        } catch (error) {
            console.error("Error unloading editor:", error);
        }
    }

    function handleFileIconClick() {
        if (!(file instanceof TFile)) return;
        if (leaf && !(leaf as any)?.pinned) {
            leaf.openFile(file);
        } else plugin.app.workspace.getLeaf(false).openFile(file);
    }

    function handleEditorClick() {
        // @ts-ignore
        const editor = createdLeaf?.view?.editMode?.editor;
        if (editor && !editor.hasFocus()) {
            editor.focus();
        }
    }
    
    // Toggle collapse/expand state
    function toggleCollapse() {
        isCollapsed = !isCollapsed;
    }
</script>

<div class="daily-note-container" data-id='dn-editor-{file.path}' bind:this={containerEl} style="min-height: {isCollapsed ? 'auto' : editorHeight + 'px'};">
    <div class="daily-note">
        {#if title}
            <div class="daily-note-header">
                <div class="daily-note-title inline-title">
                    <!-- svelte-ignore a11y-interactive-supports-focus -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span role="link" class="clickable-link" on:click={handleFileIconClick} data-title={title}>{formattedTitle || title}</span>
                </div>
            </div>
        {/if}
        <div class="daily-note-editor" data-collapsed={isCollapsed} aria-hidden="true" bind:this={editorEl} data-title={title} on:click={handleEditorClick}>
            {#if !rendered && shouldRender}
                <div class="editor-placeholder">Loading...</div>
            {/if}
            {#if !shouldRender && !rendered}
                <div class="editor-placeholder">Scroll to view content</div>
            {/if}
        </div>
    </div>
</div>

<style>
    .daily-note {
        margin-bottom: var(--size-4-2);
        padding-bottom: var(--size-4-4);
    }

    .daily-note:has(.daily-note-editor[data-collapsed="true"]) {
        margin-bottom: 0;
        padding-bottom: 0;
    }

    .daily-note-header {
        border-left: 3px solid var(--color-accent);
        padding-left: 12px;
        margin-bottom: var(--size-4-4);
    }

    .daily-note:has(.is-readable-line-width) .daily-note-header {
        max-width: var(--file-line-width);
        margin-left: auto;
        margin-right: auto;
    }

    .daily-note:not(:has(.is-readable-line-width)) .daily-note-header {
        margin-left: calc((100% - var(--file-line-width)) / 2);
        margin-right: calc((100% - var(--file-line-width)) / 2);
    }

    .daily-note-title {
        font-size: 1.25em;
        font-weight: 600;
    }

    .daily-note-editor {
        min-height: 100px;
    }

    .daily-note-editor[data-collapsed="true"] {
        display: none;
    }

    .clickable-link {
        cursor: pointer;
        text-decoration: none;
        color: var(--text-normal);
    }

    .clickable-link:hover {
        color: var(--color-accent);
    }

    .editor-placeholder {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
        color: var(--text-muted);
        font-style: italic;
    }
</style>
