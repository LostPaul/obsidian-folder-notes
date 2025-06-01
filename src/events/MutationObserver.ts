import { TFile, Keymap, Platform } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getFolderNote } from 'src/functions/folderNoteFunctions';
import { handleFolderClick, handleViewHeaderClick } from './handleClick';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { applyCSSClassesToFolder } from 'src/functions/styleFunctions';

let fileExplorerMutationObserver: MutationObserver | null = null;

export function registerFileExplorerObserver(plugin: FolderNotesPlugin) {
	// Run once on initial layout
	plugin.app.workspace.onLayoutReady(() => {
		initializeFolderNoteFeatures(plugin);
	});

	// Re-run when layout changes (e.g. File Explorer is reopened)
	plugin.registerEvent(
		plugin.app.workspace.on('layout-change', () => {
			initializeFolderNoteFeatures(plugin);
		})
	);

	// Also listen for file-open events (once)
	plugin.registerEvent(
		plugin.app.workspace.on('file-open', (file) => {
			if (file instanceof TFile) {
				scheduleIdle(() => updateBreadcrumbs(plugin), { timeout: 1000 });
			}
		})
	);
}

export function unregisterFileExplorerObserver() {
	if (fileExplorerMutationObserver) {
		fileExplorerMutationObserver.disconnect();
		fileExplorerMutationObserver = null;
	}
}

function initializeFolderNoteFeatures(plugin: FolderNotesPlugin) {
	const explorer = document.querySelector('.workspace-leaf-content[data-type="file-explorer"] .nav-files-container');
	if (!explorer) return;

	initializeAllFolderTitles(explorer, plugin);
	observeFolderTitleMutations(explorer, plugin);

	explorer.addEventListener('click', (e) => handleBreadcrumbClick((e as MouseEvent), plugin), true);
}

/**
 * Observes the File Explorer for newly added folder elements and applies plugin logic (e.g., styles, event listeners)
 * automatically when folders are created, expanded, or when the File Explorer view is reopened.
 */
function observeFolderTitleMutations(container: Element, plugin: FolderNotesPlugin) {
	if (fileExplorerMutationObserver) {
		fileExplorerMutationObserver.disconnect();
	}
	fileExplorerMutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (!(node instanceof HTMLElement)) continue;
				processAddedFolderNodes(node, plugin);
			}
		}
	});

	fileExplorerMutationObserver.observe(container, { childList: true, subtree: true });
}

function initializeAllFolderTitles(container: Element, plugin: FolderNotesPlugin) {
	const allTitles = container.querySelectorAll('.nav-folder-title-content');
	for (const title of Array.from(allTitles)) {
		const folderTitle = title as HTMLElement;
		const folderEl = folderTitle.closest('.nav-folder-title');
		if (!folderEl) continue;

		const folderPath = folderEl.getAttribute('data-path') || '';
		setupFolderTitle(folderTitle, plugin, folderPath);
	}
}

function processAddedFolderNodes(node: HTMLElement, plugin: FolderNotesPlugin) {
	const titles: HTMLElement[] = [];
	if (node.matches('.nav-folder-title-content')) {
		titles.push(node);
	}
	node.querySelectorAll('.nav-folder-title-content').forEach((el) => {
		titles.push(el as HTMLElement);
	});

	titles.forEach((folderTitle) => {
		const folderEl = folderTitle.closest('.nav-folder-title');
		const folderPath = folderEl?.getAttribute('data-path') || '';
		if (!folderEl || !folderPath) {
			setTimeout(() => {
				const retryFolderEl = folderTitle.closest('.nav-folder-title');
				const retryFolderPath = retryFolderEl?.getAttribute('data-path') || '';
				if (retryFolderEl && retryFolderPath) {
					setupFolderTitle(folderTitle, plugin, retryFolderPath);
				}
			}, 50);
			return;
		}
		setupFolderTitle(folderTitle, plugin, folderPath);
	});
}

async function setupFolderTitle(folderTitle: HTMLElement, plugin: FolderNotesPlugin, folderPath: string) {
	if (folderTitle.dataset.initialized === 'true') return;
	if (!folderPath) return;
	if (Platform.isMobile && plugin.settings.disableOpenFolderNoteOnClick) return;

	folderTitle.dataset.initialized = 'true';
	await applyCSSClassesToFolder(folderPath, plugin);

	folderTitle.addEventListener('auxclick', (event: MouseEvent) => {
		if (event.button === 1) handleFolderClick(event, plugin);
	}, { capture: true });

	folderTitle.onclick = (event: MouseEvent) => handleFolderClick(event, plugin);

	plugin.registerDomEvent(folderTitle, 'pointerover', (event: MouseEvent) => {
		plugin.hoveredElement = folderTitle;
		plugin.mouseEvent = event;

		if (!Keymap.isModEvent(event)) return;
		if (!(event.target instanceof HTMLElement)) return;

		const folderNote = getFolderNote(plugin, folderPath);
		if (!folderNote) return;

		plugin.app.workspace.trigger('hover-link', {
			event,
			source: 'preview',
			hoverParent: { file: folderNote },
			targetEl: event.target,
			linktext: folderNote.basename,
			sourcePath: folderNote.path,
		});
		plugin.hoverLinkTriggered = true;
	});

	plugin.registerDomEvent(folderTitle, 'pointerout', () => {
		plugin.hoveredElement = null;
		plugin.mouseEvent = null;
		plugin.hoverLinkTriggered = false;
	});
}

async function updateBreadcrumbs(plugin: FolderNotesPlugin) {
	const headers = document.querySelectorAll('span.view-header-breadcrumb');
	headers.forEach(async (breadcrumb: HTMLElement) => {
		let path = '';
		const allCrumbs = breadcrumb.parentElement?.querySelectorAll('span.view-header-breadcrumb');
		if (!allCrumbs) return;

		for (const crumb of Array.from(allCrumbs)) {
			path += crumb.getAttribute('old-name') ?? (crumb as HTMLElement).innerText.trim();
			path += '/';
			const folderPath = path.slice(0, -1);
			const folder = plugin.fmtpHandler?.modifiedFolders.get(folderPath);
			if (folder && plugin.settings.frontMatterTitle.path && plugin.settings.frontMatterTitle.enabled) {
				crumb.setAttribute('old-name', folder.name || '');
				(crumb as HTMLElement).innerText = folder.newName || '';
			}
			const excludedFolder = getExcludedFolder(plugin, folderPath, true);
			if (excludedFolder?.disableFolderNote) return;
			const folderNote = getFolderNote(plugin, folderPath);
			if (folderNote) crumb.classList.add('has-folder-note');
		}

		breadcrumb.parentElement?.setAttribute('data-path', path.slice(0, -1));
	});
}

function handleBreadcrumbClick(event: MouseEvent, plugin: FolderNotesPlugin) {
	const target = event.target as HTMLElement;
	const breadcrumb = target.closest('span.view-header-breadcrumb') as HTMLElement;
	if (!breadcrumb || breadcrumb.onclick) return;

	breadcrumb.addEventListener('click', (e) => {
		handleViewHeaderClick(e, plugin);
	}, { capture: true });
}

// Schedules a callback to run when the browser is idle, or after a timeout as a fallback.
// - callback: The function to execute when idle or after the timeout.
// - options: Optional object with a 'timeout' property (in milliseconds).
function scheduleIdle(callback: () => void, options?: { timeout: number }) {
	if ('requestIdleCallback' in window) {
		(window as any).requestIdleCallback(callback, options);
	} else {
		setTimeout(callback, options?.timeout || 200);
	}
}
