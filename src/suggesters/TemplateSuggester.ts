// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes and https://github.com/SilentVoid13/Templater

import { TAbstractFile, TFile, TFolder, Vault } from 'obsidian';
import { TextInputSuggest } from './Suggest';
import FolderNotesPlugin from '../main';
import { getTemplatePlugins } from 'src/template';
export enum FileSuggestMode {
    TemplateFiles,
    ScriptFiles,
}

export class TemplateSuggest extends TextInputSuggest<TFile> {
	constructor(
        public inputEl: HTMLInputElement,
        plugin: FolderNotesPlugin
	) {
		super(inputEl, plugin);
	}


	get_error_msg(mode: FileSuggestMode): string {
		switch (mode) {
			case FileSuggestMode.TemplateFiles:
				return 'Templates folder doesn\'t exist';
			case FileSuggestMode.ScriptFiles:
				return 'User Scripts folder doesn\'t exist';
		}
	}

	getSuggestions(input_str: string): TFile[] {
		const { templateFolder, templaterPlugin } = getTemplatePlugins(this.plugin.app);
		if ((!templateFolder || templateFolder?.trim() === '') && !templaterPlugin) {
			this.plugin.settings.templatePath = '';
			this.plugin.saveSettings();
			return [];
		}
		let folder: TFolder;
		if (templaterPlugin) {
			folder = this.plugin.app.vault.getAbstractFileByPath(templaterPlugin.plugin?.settings?.templates_folder as string) as TFolder;

		} else {
			folder = this.plugin.app.vault.getAbstractFileByPath(templateFolder) as TFolder;
		}

		const files: TFile[] = [];
		const lower_input_str = input_str.toLowerCase();

		Vault.recurseChildren(folder, (file: TAbstractFile) => {
			if (file instanceof TFile &&
                file.path.toLowerCase().contains(lower_input_str)
			) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.name.replace('.md', ''));
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.name.replace('.md', '');
		this.inputEl.trigger('input');
		this.plugin.settings.templatePath = file.path;
		this.plugin.saveSettings();
		this.close();
	}
}
