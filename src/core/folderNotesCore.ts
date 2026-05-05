export type StorageLocation = 'insideFolder' | 'parentFolder' | 'vaultFolder';

export interface FolderNotesCoreSettings {
	folderNoteName: string;
	folderNoteType: string;
	supportedFileTypes: string[];
	storageLocation: StorageLocation;
	templatePath: string;
	excludeFolders: Array<{
		type?: string;
		id?: string;
		path?: string;
		detached?: boolean;
		detachedFilePath?: string;
		showFolderNote?: boolean;
		hideInSettings?: boolean;
		disableFolderNote?: boolean;
		disableSync?: boolean;
		subFolders?: boolean;
		position?: number;
		[key: string]: unknown;
	}>;
}

export interface FolderNoteResolution {
	folderPath: string;
	folderName: string;
	fileName: string;
	extension: string;
	notePath: string;
	storageLocation: StorageLocation;
}

export interface ExistingFolderNote extends FolderNoteResolution {
	exists: true;
	matchedExtension: string;
}

export const CORE_DEFAULT_SETTINGS: FolderNotesCoreSettings = {
	folderNoteName: '{{folder_name}}',
	folderNoteType: '.md',
	supportedFileTypes: ['md', 'canvas', 'base'],
	storageLocation: 'insideFolder',
	templatePath: '',
	excludeFolders: [],
};

export function mergeCoreSettings(
	settings: Partial<FolderNotesCoreSettings> | null | undefined,
): FolderNotesCoreSettings {
	return {
		...CORE_DEFAULT_SETTINGS,
		...settings,
		supportedFileTypes: settings?.supportedFileTypes ?? CORE_DEFAULT_SETTINGS.supportedFileTypes,
		excludeFolders: settings?.excludeFolders ?? CORE_DEFAULT_SETTINGS.excludeFolders,
	};
}

export function normalizeVaultPath(input: string): string {
	const normalized = input.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/^\/+/, '');
	const parts = normalized.split('/').filter((part) => part.length > 0 && part !== '.');
	if (parts.some((part) => part === '..')) {
		throw new Error(`Vault-relative paths cannot contain '..': ${input}`);
	}
	return parts.join('/');
}

export function getFolderName(folderPath: string): string {
	const normalized = normalizeVaultPath(folderPath);
	const parts = normalized.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? '';
}

export function getParentFolderPath(vaultPath: string): string {
	const normalized = normalizeVaultPath(vaultPath);
	const index = normalized.lastIndexOf('/');
	if (index < 0) return '';
	return normalized.slice(0, index);
}

export function normalizeExtension(extension: string): string {
	const trimmed = extension.trim();
	if (!trimmed) return '.md';
	return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

export function normalizeFolderNoteType(type: string): string {
	return normalizeExtension(type) === '.excalidraw' ? '.md' : normalizeExtension(type);
}

export function extensionForSupportedType(type: string): string {
	const extension = normalizeExtension(type);
	return extension === '.excalidraw' ? '.md' : extension;
}

export function buildFolderNoteResolution(
	folderPathInput: string,
	settingsInput?: Partial<FolderNotesCoreSettings>,
	extensionInput?: string,
): FolderNoteResolution {
	const settings = mergeCoreSettings(settingsInput);
	const folderPath = normalizeVaultPath(folderPathInput);
	const folderName = getFolderName(folderPath);
	if (!folderPath || !folderName) {
		throw new Error('A non-root folder path is required');
	}

	const fileName = settings.folderNoteName.replace('{{folder_name}}', folderName);
	const extension = normalizeFolderNoteType(extensionInput ?? settings.folderNoteType);
	let noteFolder = folderPath;

	if (settings.storageLocation === 'parentFolder') {
		noteFolder = getParentFolderPath(folderPath);
	} else if (settings.storageLocation === 'vaultFolder') {
		noteFolder = '';
	}

	const notePath = normalizeVaultPath(
		noteFolder ? `${noteFolder}/${fileName}${extension}` : `${fileName}${extension}`,
	);

	return {
		folderPath,
		folderName,
		fileName,
		extension,
		notePath,
		storageLocation: settings.storageLocation,
	};
}

export function candidateFolderNotePaths(
	folderPathInput: string,
	settingsInput?: Partial<FolderNotesCoreSettings>,
): FolderNoteResolution[] {
	const settings = mergeCoreSettings(settingsInput);
	const primary = buildFolderNoteResolution(folderPathInput, settings);
	const extensions = [
		primary.extension,
		...settings.supportedFileTypes.map(extensionForSupportedType),
	].filter((extension, index, all) => all.indexOf(extension) === index);

	return extensions.map((extension) => buildFolderNoteResolution(folderPathInput, settings, extension));
}

export function extractFolderName(template: string, changedFileName: string): string | null {
	const [prefix, suffix] = template.split('{{folder_name}}');
	if (prefix.trim() === '' && suffix.trim() === '') {
		return changedFileName;
	}
	if (!changedFileName.startsWith(prefix) || !changedFileName.endsWith(suffix)) {
		return null;
	}
	if (changedFileName.startsWith(prefix) && prefix.trim() !== '') {
		return changedFileName.slice(prefix.length).replace(suffix, '');
	} else if (changedFileName.endsWith(suffix) && suffix.trim() !== '') {
		return changedFileName.slice(0, -suffix.length);
	}
	return null;
}

export function detachFolderInSettings(
	settingsInput: Partial<FolderNotesCoreSettings>,
	folderPathInput: string,
	notePathInput: string,
): FolderNotesCoreSettings {
	const settings = mergeCoreSettings(settingsInput);
	const folderPath = normalizeVaultPath(folderPathInput);
	const notePath = normalizeVaultPath(notePathInput);
	const excludeFolders = settings.excludeFolders.filter(
		(folder) => !(folder.path === folderPath && folder.detached),
	);

	excludeFolders.push({
		type: 'folder',
		id: createId(),
		path: folderPath,
		position: excludeFolders.length,
		subFolders: false,
		disableSync: true,
		disableFolderNote: true,
		disableAutoCreate: true,
		enableCollapsing: false,
		excludeFromFolderOverview: false,
		hideInSettings: true,
		detached: true,
		detachedFilePath: notePath,
		showFolderNote: true,
	});

	return {
		...settings,
		excludeFolders,
	};
}

export function reattachFolderInSettings(
	settingsInput: Partial<FolderNotesCoreSettings>,
	folderPathInput: string,
): FolderNotesCoreSettings {
	const settings = mergeCoreSettings(settingsInput);
	const folderPath = normalizeVaultPath(folderPathInput);
	return {
		...settings,
		excludeFolders: settings.excludeFolders.filter(
			(folder) => !(folder.path === folderPath && folder.detached),
		),
	};
}

function createId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `fn-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}
