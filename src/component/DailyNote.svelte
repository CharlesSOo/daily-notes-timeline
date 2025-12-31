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
    let headerEl: HTMLElement;
    let title: string;
    let formattedTitle: string;

    let rendered: boolean = false;

    let createdLeaf: WorkspaceLeaf;
    let unloadTimeout: number | null = null;
    let editorHeight: number = 500; // Large minimum for Reflect-style breathing room

    // Track if this component is being destroyed
    let isDestroying = false;

    // Track if the note is collapsed
    let isCollapsed: boolean = false;

    let isToday: boolean = false;

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

    function checkIsToday(basename: string): boolean {
        const date = moment(basename, "YYYY-MM-DD", true);
        return date.isValid() && date.isSame(moment(), "day");
    }

    onMount(() => {
        if (file instanceof TFile) {
            title = file.basename;
            formattedTitle = formatDateWithOrdinal(file.basename);
            isToday = checkIsToday(file.basename);
        }
    });

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
                    // Ensure we keep at least 60vh or 500px, but expand if content is larger
                    const viewportMin = Math.max(500, window.innerHeight * 0.6);
                    editorHeight = Math.max(actualHeight, viewportMin);
                    containerEl.style.minHeight = `${editorHeight}px`;
                }

                // Match header position to editor content position
                if (headerEl && editorEl) {
                    // Try to find the actual line content position
                    const cmLine = editorEl.querySelector('.cm-line');
                    const cmSizer = editorEl.querySelector('.cm-sizer');
                    const target = cmLine || cmSizer;
                    if (target) {
                        const targetRect = target.getBoundingClientRect();
                        const containerRect = containerEl.getBoundingClientRect();
                        const leftOffset = targetRect.left - containerRect.left;
                        // Account for the blue bar (3px border + 12px padding = 15px)
                        const barOffset = isToday ? 15 : 0;
                        headerEl.style.marginLeft = `${leftOffset - barOffset}px`;
                    }
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
            // Blur any focused elements before detaching to prevent aria-hidden warnings
            const focusedEl = editorEl?.querySelector(':focus');
            if (focusedEl instanceof HTMLElement) {
                focusedEl.blur();
            }

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

<div class="daily-note-container" data-id='dn-editor-{file.path}' bind:this={containerEl} style="min-height: {isCollapsed ? 'auto' : 'max(500px, 60vh)'};">
    <div class="daily-note">
        {#if title}
            <div class="daily-note-header" class:is-today={isToday} bind:this={headerEl}>
                <div class="daily-note-title inline-title">
                    <!-- svelte-ignore a11y-interactive-supports-focus -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span role="link" class="clickable-link" on:click={handleFileIconClick} data-title={title}>{formattedTitle || title}</span>
                </div>
            </div>
        {/if}
        <div class="daily-note-editor" data-collapsed={isCollapsed} bind:this={editorEl} data-title={title} on:click={handleEditorClick}>
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
        margin-bottom: 0;
        padding-bottom: 8px;
    }

    .daily-note:has(.daily-note-editor[data-collapsed="true"]) {
        margin-bottom: 0;
        padding-bottom: 0;
    }

    .daily-note-header {
        margin-bottom: 8px;
        /* marginLeft set dynamically to match editor content position */
    }

    .daily-note-header.is-today {
        border-left: 3px solid var(--color-accent);
        padding-left: 12px;
    }

    .daily-note-title {
        /* Inherit from Obsidian's inline-title / heading settings */
        font-size: var(--inline-title-size, var(--h1-size, 1.5em));
        font-weight: var(--inline-title-weight, var(--h1-weight, 700));
        line-height: var(--inline-title-line-height, var(--h1-line-height, 1.3));
    }

    .daily-note-editor {
        min-height: 0;
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
