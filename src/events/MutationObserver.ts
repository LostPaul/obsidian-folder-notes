import { Keymap, Platform } from 'obsidian';
import type FolderNotesPlugin from 'src/main';
import { getFolderNote, getFolderNoteFolder } from 'src/functions/folderNoteFunctions';
import { handleViewHeaderClick } from './handleClick';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { updateCSSClassesForFolder } from 'src/functions/styleFunctions';

let fileExplorerMutationObserver: MutationObserver | null = null;
let reconcileTimeout: number | null = null;

export function registerFileExplorerObserver(plugin: FolderNotesPlugin): void {
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
		}),
	);
}

export function unregisterFileExplorerObserver(): void {
	if (fileExplorerMutationObserver) {
		fileExplorerMutationObserver.disconnect();
		fileExplorerMutationObserver = null;
	}
	if (reconcileTimeout !== null) {
		window.clearTimeout(reconcileTimeout);
		reconcileTimeout = null;
	}
}

function initializeFolderNoteFeatures(plugin: FolderNotesPlugin): void {
	initializeAllFolderTitles(plugin);
	observeFolderTitleMutations(plugin);
}

function initializeBreadcrumbs(plugin: FolderNotesPlugin): void {
	const titleContainers = activeDocument.querySelectorAll('.view-header-title-container');
	if (!titleContainers.length) return;
	titleContainers.forEach((container) => {
		if (!(container.instanceOf(HTMLElement))) return;
		scheduleIdle(() => updateFolderNamesInPath(plugin, container), { timeout: 1000 });
	});
}

/**
 * Observes the File Explorer for newly added folder elements and applies plugin logic (e.g., styles, event listeners)
 * automatically when folders are created, expanded, or when the File Explorer view is reopened.
 */
function observeFolderTitleMutations(plugin: FolderNotesPlugin): void {
	if (fileExplorerMutationObserver) {
		fileExplorerMutationObserver.disconnect();
	}
	fileExplorerMutationObserver = new MutationObserver((mutations) => {
		const affectedFolderPaths = new Set<string>();
		let explorerTouched = false;
		for (const mutation of mutations) {
			// Obsidian can rebuild the parent folder title when its children
			// change. Title text is also rewritten directly on a text node,
			// which reports the text node as the mutation target, so fall back
			// to its parent element.
			const target = mutation.target instanceof Element
				? mutation.target
				: mutation.target.parentElement;
			const folderPath = getAffectedFolderPath(target);
			if (folderPath) {
				explorerTouched = true;
				affectedFolderPaths.add(folderPath);
			}

			for (const node of Array.from(mutation.addedNodes)) {
				if (!(node.instanceOf(HTMLElement))) continue;
				if (processAddedFolders(node, plugin)) {
					explorerTouched = true;
				}
			}
		}

		affectedFolderPaths.forEach((folderPath) => {
			void updateCSSClassesForFolder(folderPath, plugin);
			// Obsidian rewrites the folder title text in place (e.g. when the
			// explorer re-sorts or re-renders after its children change), which
			// wipes the Front Matter Title folder name applied by
			// changeFolderNameInExplorer. Re-apply it for affected folders.
			if (plugin.settings.frontMatterTitle.enabled) {
				void plugin.fmtpHandler?.fmptUpdateFolderName(
					{ id: '', result: false, path: folderPath, pathOnly: false },
					false,
				);
			}
		});

		if (explorerTouched && plugin.settings.frontMatterTitle.enabled) {
			scheduleFolderTitleReconcile(plugin);
		}
	});

	fileExplorerMutationObserver.observe(document, {
		childList: true,
		characterData: true,
		subtree: true,
	});
}

const RECONCILE_DELAY_MS = 500;

/**
 * Re-applies the Front Matter Title name to every folder in the File Explorer
 * once explorer mutations have settled.
 *
 * Safety net for title texts that got reset outside of the per-mutation
 * handling above, e.g. while the observer was being re-registered or while a
 * re-apply ran while the Front Matter Title resolver was momentarily unable to
 * resolve the title. Applying a title is idempotent and folders without a
 * resolvable title are skipped by fmptUpdateFolderName, so this cannot loop.
 */
function scheduleFolderTitleReconcile(plugin: FolderNotesPlugin): void {
	if (reconcileTimeout !== null) {
		window.clearTimeout(reconcileTimeout);
	}
	reconcileTimeout = window.setTimeout(() => {
		reconcileTimeout = null;
		reconcileFolderTitles(plugin);
	}, RECONCILE_DELAY_MS);
}

function reconcileFolderTitles(plugin: FolderNotesPlugin): void {
	if (!plugin.settings.frontMatterTitle.enabled) return;
	const allTitles = activeDocument.querySelectorAll('.nav-folder-title');
	for (const folderTitle of Array.from(allTitles)) {
		if (!(folderTitle.instanceOf(HTMLElement))) continue;
		const folderPath = folderTitle.getAttribute('data-path');
		if (!folderPath) continue;
		plugin.fmtpHandler?.fmptUpdateFolderName(
			{ id: '', result: false, path: folderPath, pathOnly: false },
			false,
		);
	}
}

function getAffectedFolderPath(target: Node | null): string | null {
	if (!target || !(target.instanceOf(HTMLElement))) return null;
	const folder = target.closest('.nav-folder');
	const folderTitle = folder?.querySelector('.nav-folder-title');
	return folderTitle?.getAttribute('data-path') ?? null;
}

function initializeAllFolderTitles(plugin: FolderNotesPlugin): void {
	const allTitles = activeDocument.querySelectorAll('.nav-folder-title-content');
	for (const title of Array.from(allTitles)) {
		const folderTitle = title as HTMLElement;
		const folderEl = folderTitle.closest('.nav-folder-title');
		if (!folderEl) continue;

		const folderPath = folderEl.getAttribute('data-path') || '';
		setupFolderTitle(folderTitle, plugin, folderPath);
	}
}

function processAddedFolders(node: HTMLElement, plugin: FolderNotesPlugin): boolean {
	const titles: HTMLElement[] = [];
	if (node.matches('.nav-folder-title-content')) {
		titles.push(node);
	}
	node.querySelectorAll('.nav-folder-title-content').forEach((el) => {
		titles.push(el as HTMLElement);
	});
	if (titles.length === 0) return false;

	titles.forEach((folderTitle) => {
		const folderEl = folderTitle.closest('.nav-folder-title');
		const folderPath = folderEl?.getAttribute('data-path') || '';
		const RETRY_TIMEOUT = 50;
		if (!folderEl || !folderPath) {
			window.setTimeout(() => {
				const retryFolderEl = folderTitle.closest('.nav-folder-title');
				const retryFolderPath = retryFolderEl?.getAttribute('data-path') || '';
				if (retryFolderEl && retryFolderPath) {
					setupFolderTitle(folderTitle, plugin, retryFolderPath);
				}
			}, RETRY_TIMEOUT);
			return;
		}
		setupFolderTitle(folderTitle, plugin, folderPath);
	});
	return true;
}

async function setupFolderTitle(
	folderTitle: HTMLElement,
	plugin: FolderNotesPlugin,
	folderPath: string,
): Promise<void> {
	if (folderTitle.dataset.initialized === 'true') return;
	if (!folderPath) return;

	folderTitle.dataset.initialized = 'true';
	await updateCSSClassesForFolder(folderPath, plugin);

	if (plugin.settings.frontMatterTitle.enabled) {
		plugin.fmtpHandler?.fmptUpdateFolderName(
			{ id: '', result: false, path: folderPath, pathOnly: false },
			false,
		);
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

// eslint-disable-next-line complexity
async function updateFolderNamesInPath(
	plugin: FolderNotesPlugin,
	titleContainer: HTMLElement,
): Promise<void> {
	const titleParent = titleContainer.querySelector('.view-header-title-parent');
	let path = '';
	const TRAILING_SLASH_LENGTH = 1;

	if (titleParent?.childNodes.length === 0) {
		titleContainer.classList.remove('hide-folder-note-title-in-path');
	}

	for (const breadcrumb of Array.from(titleParent?.childNodes ?? [])) {
		if (!(breadcrumb instanceof HTMLElement)) continue;
		if (breadcrumb.classList.contains('view-header-breadcrumb-separator')) {
			if (breadcrumb.nextSibling === null) {
				breadcrumb.classList.add('is-last-separator');
			}
			continue;
		}

		path += breadcrumb.getAttribute('old-name') ?? (breadcrumb).innerText.trim();
		path += '/';
		const folderPath = path.slice(0, -TRAILING_SLASH_LENGTH);

		const excludedFolder = getExcludedFolder(plugin, folderPath, true);
		if (excludedFolder?.disableFolderNote) return;
		const folderNote = getFolderNote(plugin, folderPath);
		const viewHeaderTitle = titleContainer.querySelector('.view-header-title');

		if (viewHeaderTitle && folderNote) {
			const filePath = path + (viewHeaderTitle as HTMLElement).innerText.trim() + '.md';
			const file = plugin.app.vault.getAbstractFileByPath(
				filePath);
			const folder = getFolderNoteFolder(plugin, folderNote, file?.name ?? '');
			if (folder && file && file.path === folderNote?.path && file.parent?.path !== '/') {
				viewHeaderTitle.parentElement?.classList.add('hide-folder-note-title-in-path');
				viewHeaderTitle.classList.add('path-is-folder-note');
			} else {
				viewHeaderTitle.parentElement?.classList.remove('hide-folder-note-title-in-path');
				viewHeaderTitle.classList.remove('path-is-folder-note');
			}
		}
		if (!folderNote) {
			breadcrumb.classList.remove('has-folder-note');
			breadcrumb.removeAttribute('data-path');
			continue;
		}
		breadcrumb.classList.add('has-folder-note');
		breadcrumb?.setAttribute('data-path', path.slice(0, -TRAILING_SLASH_LENGTH));
		if (!breadcrumb.onclick) {
			breadcrumb.addEventListener('click', (e) => {
				handleViewHeaderClick(e, plugin);
			}, { capture: true });
		}

		if (plugin.settings.frontMatterTitle.enabled) {
			plugin.fmtpHandler?.fmptUpdateFolderName(
				{ id: '', result: false, path: folderPath, pathOnly: true, breadcrumb: breadcrumb },
				true,
			);
		}
	}
}

// Schedules a callback to run when the browser is idle, or after a timeout as a fallback.
// - callback: The function to execute when idle or after the timeout.
// - options: Optional object with a 'timeout' property (in milliseconds).
function scheduleIdle(callback: () => void, options?: { timeout: number }): void {
	const DEFAULT_IDLE_TIMEOUT = 200;
	if ('requestIdleCallback' in window) {
		const windowWithIdle = window as Window & {
			requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void
		};
		windowWithIdle.requestIdleCallback(callback, options);
	} else {
		globalThis.setTimeout(callback, options?.timeout || DEFAULT_IDLE_TIMEOUT);
	}
}
