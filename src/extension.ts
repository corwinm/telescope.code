// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TelescopeController } from './telescope/telescope';
import { TelescopeDocumentProvider } from './providers/TelescopeDocumentProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "telescope-code" is now active!');

	const telescopeDocumentProvider = new TelescopeDocumentProvider();
	const providerRegistration = vscode.workspace.registerTextDocumentContentProvider('telescope', telescopeDocumentProvider);

	const telescopeController = new TelescopeController();

	const searchCommand = vscode.commands.registerCommand('telescope-code.search', () => {
		telescopeController.show();
	});

	const selectResultCommand = vscode.commands.registerCommand('telescope-code.selectResult', () => {
		telescopeController.selectResult();
	});

	const moveSelectionUpCommand = vscode.commands.registerCommand('telescope-code.moveSelectionUp', () => {
		telescopeController.moveSelectionUp();
	});

	const moveSelectionDownCommand = vscode.commands.registerCommand('telescope-code.moveSelectionDown', () => {
		telescopeController.moveSelectionDown();
	});

	context.subscriptions.push(providerRegistration, searchCommand, selectResultCommand, moveSelectionUpCommand, moveSelectionDownCommand, telescopeController);
}

export function deactivate() {}
