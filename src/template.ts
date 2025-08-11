import { TFile, WorkspaceLeaf, type App } from 'obsidian';
import type FolderNotesPlugin from './main';

interface TemplatesPlugin {
	enabled: boolean;
	instance: {
		options: {
			folder: string;
		};
		insertTemplate: (templateFile: TFile) => Promise<void>;
	};
}

interface TemplaterPlugin {
	settings?: {
		empty_file_template?: string;
		template_folder?: string;
	};
	templater?: {
		write_template_to_file: (templateFile: TFile, targetFile: TFile) => Promise<void>;
	};
}

interface TemplatePluginReturn {
	templatesPlugin: TemplatesPlugin | null;
	templatesEnabled: boolean;
	templaterPlugin: TemplaterPlugin['templater'] | null;
	templaterEnabled: boolean;
	templaterEmptyFileTemplate?: string;
	templateFolder?: string;
}

export async function applyTemplate(
	plugin: FolderNotesPlugin,
	file: TFile,
	leaf?: WorkspaceLeaf | null,
	templatePath?: string,
): Promise<void> {
	const fileContent = await plugin.app.vault.read(file).catch((err) => {
		console.error(`Error reading file ${file.path}:`, err);
	});
	if (fileContent !== '') return;

	const templateFile = templatePath
		? plugin.app.vault.getAbstractFileByPath(templatePath)
		: null;

	if (templateFile && templateFile instanceof TFile) {
		try {
			const {
				templatesEnabled,
				templaterEnabled,
				templatesPlugin,
				templaterPlugin,
			} = getTemplatePlugins(plugin.app);
			const templateContent = await plugin.app.vault.read(templateFile);
			// eslint-disable-next-line max-len
			if (templateContent.includes('==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==')) {
				return;
			}

			// Prioritize Templater if both plugins are enabled
			if (templaterEnabled && templaterPlugin) {
				return await templaterPlugin.write_template_to_file(templateFile, file);
			} else if (templatesEnabled && templatesPlugin) {
				if (leaf instanceof WorkspaceLeaf) {
					await leaf.openFile(file);
				}
				return await templatesPlugin.instance.insertTemplate(templateFile);
			}
			await plugin.app.vault.modify(file, templateContent);


		} catch (e) {
			console.error(e);
		}
	}
}

export function getTemplatePlugins(app: App): TemplatePluginReturn {
	const appAsUnknown = app as unknown as {
		internalPlugins: {
			plugins: {
				templates: TemplatesPlugin;
			};
		};
		plugins: {
			plugins: {
				'templater-obsidian': TemplaterPlugin;
			};
			enabledPlugins: Set<string>;
		};
	};

	const templatesPlugin = appAsUnknown.internalPlugins.plugins.templates;
	const templatesEnabled = templatesPlugin?.enabled ?? false;
	const templaterPlugin = appAsUnknown.plugins.plugins['templater-obsidian'];
	const templaterEnabled = appAsUnknown.plugins.enabledPlugins.has('templater-obsidian');

	const templaterEmptyFileTemplate =
		templaterPlugin && templaterPlugin.settings?.empty_file_template;

	const templateFolder = templatesEnabled
		? templatesPlugin.instance.options.folder
		: templaterPlugin?.settings?.template_folder;

	return {
		templatesPlugin: templatesPlugin || null,
		templatesEnabled,
		templaterPlugin: templaterPlugin?.templater || null,
		templaterEnabled,
		templaterEmptyFileTemplate,
		templateFolder,
	};
}
