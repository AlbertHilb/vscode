/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { format } from 'vs/base/common/strings';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { withNullAsUndefined } from 'vs/base/common/types';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { IChatWidgetService } from 'vs/workbench/contrib/chat/browser/chat';
import { IAccessibleViewService } from 'vs/workbench/contrib/accessibility/browser/accessibleView';
import { InlineChatController } from 'vs/workbench/contrib/inlineChat/browser/inlineChatController';

export function getAccessibilityHelpText(accessor: ServicesAccessor, type: 'chat' | 'inline'): string {
	const keybindingService = accessor.get(IKeybindingService);
	const content = [];
	if (type === 'chat') {
		content.push(localize('chat.overview', 'Chat responses will be announced as they come in. A response will indicate the number of code blocks, if any, and then the rest of the response.'));
		content.push(localize('chat.requestHistory', 'In the input box, use UpArrow/DownArrow to navigate your request history. Edit input and use enter to run a new request.'));
		content.push(descriptionForCommand('chat.action.focus', localize('workbench.action.chat.focus', 'The Focus Chat command ({0}) focuses the chat request/response list, which can be navigated with UpArrow/DownArrow.',), localize('workbench.action.chat.focusNoKb', 'The Focus Chat List command focuses the chat request/response list, which can be navigated with UpArrow/DownArrow and is currently not triggerable by a keybinding.'), keybindingService));
		content.push(descriptionForCommand('workbench.action.chat.focusInput', localize('workbench.action.chat.focusInput', 'The Focus Chat Input command ({0}) focuses the input box for chat requests.'), localize('workbench.action.interactiveSession.focusInputNoKb', 'Focus Chat Input command focuses the input box for chat requests and is currently not triggerable by a keybinding.'), keybindingService));
		content.push(descriptionForCommand('workbench.action.chat.nextCodeBlock', localize('workbench.action.chat.nextCodeBlock', 'The Chat: Next Code Block command ({0}) focuses the next code block within a response.'), localize('workbench.action.chat.nextCodeBlockNoKb', 'The Chat: Next Code Block command focuses the next code block within a response and is currently not triggerable by a keybinding.'), keybindingService));
		content.push(descriptionForCommand('workbench.action.chat.clear', localize('workbench.action.chat.clear', 'The Chat Clear command ({0}) clears the request/response list.'), localize('workbench.action.chat.clearNoKb', 'The Chat Clear command clears the request/response list and is currently not triggerable by a keybinding.'), keybindingService));
	} else {
		const startChatKeybinding = keybindingService.lookupKeybinding('inlineChat.start')?.getAriaLabel();
		content.push(localize('inlineChat.overview', "Inline chat occurs within a code editor and takes into account current selection. It is useful for refactoring, fixing, and more. Keep in mind that Copilot generated code may be incorrect."));
		content.push(localize('inlineChat.access', "It can be activated via the Fix and Explain with Copilot context menu actions or directly using the command: Inline Chat: Start Code Chat ({0}).", startChatKeybinding));
		content.push(localize('chat.requestHistoryInline', 'In the input box, use UpArrow/DownArrow to navigate your request history. Edit input and use enter or the make request button to run a new request.'));
		content.push(localize('inlineChat.contextActions', "Explain and Fix with Copilot actions run a request prefixed with /fix or /explain. These prefixes can be used directly in the input box to apply those specific actions."));
		content.push(localize('inlineChat.fix', "When a request is prefixed with /fix, a response will indicate the problem with the current code. A diff editor will be rendered and can be reached by tabbing."));
		const diffReviewKeybinding = keybindingService.lookupKeybinding('editor.action.diffReview.next')?.getAriaLabel();
		content.push(diffReviewKeybinding ? localize('inlineChat.diff', "Once in the diff editor, enter review mode with ({0}). Use up and down arrows to navigate lines with the proposed changes.", diffReviewKeybinding) : localize('inlineChat.diffNoKb', "Tab again to enter the Diff editor with the changes and enter review mode with the Go to Next Difference Command. Use Up/DownArrow to navigate lines with the proposed changes."));
		content.push(localize('inlineChat.explain', "When a request is prefixed with /explain, a response will explain the code in the current selection and the chat view will be focused."));
		content.push(localize('inlineChat.toolbar', "Use tab to reach conditional parts like commands, status, message responses and more."));
	}
	return content.join('\n');
}

function descriptionForCommand(commandId: string, msg: string, noKbMsg: string, keybindingService: IKeybindingService): string {
	const kb = keybindingService.lookupKeybinding(commandId);
	if (kb) {
		return format(msg, kb.getAriaLabel());
	}
	return format(noKbMsg, commandId);
}

export async function runAccessibilityHelpAction(accessor: ServicesAccessor, editor: ICodeEditor, type: 'chat' | 'inline'): Promise<void> {
	const widgetService = accessor.get(IChatWidgetService);
	const accessibleViewService = accessor.get(IAccessibleViewService);
	const inputEditor: ICodeEditor | undefined = type === 'chat' ? widgetService.lastFocusedWidget?.inputEditor : editor;
	const editorUri = editor.getModel()?.uri;

	if (!inputEditor || !editorUri) {
		return;
	}
	const domNode = withNullAsUndefined(inputEditor.getDomNode());
	if (!domNode) {
		return;
	}

	const cachedPosition = inputEditor.getPosition();
	inputEditor.getSupportedActions();
	const helpText = getAccessibilityHelpText(accessor, type);
	const provider = accessibleViewService.registerProvider({
		id: type,
		provideContent: () => helpText,
		onClose: () => {
			if (type === 'chat' && cachedPosition) {
				inputEditor.setPosition(cachedPosition);
				inputEditor.focus();
			} else if (type === 'inline') {
				InlineChatController.get(editor)?.focus();
			}
			provider.dispose();
		},
		options: { ariaLabel: type === 'chat' ? localize('chat-help-label', "Chat accessibility help") : localize('inline-chat-label', "Inline chat accessibility help") }
	});
	accessibleViewService.show(type);
}
