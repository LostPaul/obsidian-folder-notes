import { Keymap, Platform } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getFolderNote } from 'src/functions/folderNoteFunctions';
import { handleViewHeaderClick } from './handleClick';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { updateCSSClassesForFolder } from 'src/functions/styleFunctions';

let fileExplorerMutationObserver: MutationObserver | null = null;

export function registerFileExplorerObserver(plugin: FolderNotesPlugin) {
	// Run once on initial layout
	plugin.app.workspace.onLayoutReady(() => {
		initializeFolderNoteFeatures(plugin);
		initializeBreadcrumbs(plugin);
	});

	// Re-run when layout changes (e.g. File Explorer is reopened)
	plugin.registerEvent(
		plugin.app.workspace.on('layout-change', () => {
			initializeFolderNoteFeatures(plugin);

			const activeLeaf = plugin.app.workspace.getActiveFileView()?.containerEl;
			if (!activeLeaf) return;

			const titleContainer = activeLeaf.querySelector('.view-header-title-container');
			if (!(titleContainer instanceof HTMLElement)) return;

			updateFolderNamesInPath(plugin, titleContainer);
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
	initializeAllFolderTitles(plugin);
	observeFolderTitleMutations(plugin);
}

function initializeBreadcrumbs(plugin: FolderNotesPlugin) {
	const titleContainers = document.querySelectorAll('.view-header-title-container');
	if (!titleContainers.length) return;
	titleContainers.forEach((container) => {
		if (!(container instanceof HTMLElement)) return;
		scheduleIdle(() => updateFolderNamesInPath(plugin, container), { timeout: 1000 });
	});
}

/**
 * Observes the File Explorer for newly added folder elements and applies plugin logic (e.g., styles, event listeners)
 * automatically when folders are created, expanded, or when the File Explorer view is reopened.
 */
function observeFolderTitleMutations(plugin: FolderNotesPlugin) {
	if (fileExplorerMutationObserver) {
		fileExplorerMutationObserver.disconnect();
	}
	fileExplorerMutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (!(node instanceof HTMLElement)) continue;
				processAddedFolders(node, plugin);
			}
		}
	});

	fileExplorerMutationObserver.observe(document, { childList: true, subtree: true });
}

function initializeAllFolderTitles(plugin: FolderNotesPlugin) {
	const allTitles = document.querySelectorAll('.nav-folder-title-content');
	for (const title of Array.from(allTitles)) {
		const folderTitle = title as HTMLElement;
		const folderEl = folderTitle.closest('.nav-folder-title');
		if (!folderEl) continue;

		const folderPath = folderEl.getAttribute('data-path') || '';
		setupFolderTitle(folderTitle, plugin, folderPath);
	}
}

function processAddedFolders(node: HTMLElement, plugin: FolderNotesPlugin) {
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

	folderTitle.dataset.initialized = 'true';
	await updateCSSClassesForFolder(folderPath, plugin);

	if (plugin.settings.frontMatterTitle.enabled) {
		plugin.fmtpHandler?.fmptUpdateFolderName({ id: '', result: false, path: folderPath, pathOnly: false }, false);
	}

	if (Platform.isMobile && plugin.settings.disableOpenFolderNoteOnClick) return;

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

async function updateFolderNamesInPath(plugin: FolderNotesPlugin, titleContainer: HTMLElement) {
	const headers = titleContainer.querySelectorAll('span.view-header-breadcrumb');
	let path = '';
	headers.forEach(async (breadcrumb: HTMLElement) => {
		path += breadcrumb.getAttribute('old-name') ?? (breadcrumb as HTMLElement).innerText.trim();
		path += '/';
		const folderPath = path.slice(0, -1);

		const excludedFolder = getExcludedFolder(plugin, folderPath, true);
		if (excludedFolder?.disableFolderNote) return;
		const folderNote = getFolderNote(plugin, folderPath);
		if (!folderNote) return;
		if (folderNote) breadcrumb.classList.add('has-folder-note');

		breadcrumb?.setAttribute('data-path', path.slice(0, -1));
		if (!breadcrumb.onclick) {
			breadcrumb.addEventListener('click', (e) => {
				handleViewHeaderClick(e as MouseEvent, plugin);
			}, { capture: true });
		}

		if (plugin.settings.frontMatterTitle.enabled) {
			plugin.fmtpHandler?.fmptUpdateFolderName({ id: '', result: false, path: folderPath, pathOnly: true, breadcrumb: breadcrumb }, true);
		}
	});
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
