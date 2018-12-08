// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) 
{
	const boxRegionDecoration = vscode.window.createTextEditorDecorationType({
		// borderWidth: '1px',
		// borderStyle: 'solid',
		// borderRadius: '3px',
		outlineWidth: '1px',
		outlineStyle: 'solid',
		// overviewRulerColor: 'blue',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
		// light: {
		// 	// this color will be used in light color themes
		// 	borderColor: 'darkblue'
		// },
		// dark: {
		// 	// this color will be used in dark color themes
		// 	borderColor: 'lightblue'
		// }
	});

	let regionDecoration = vscode.window.createTextEditorDecorationType
	({
		isWholeLine: true,
		backgroundColor: ""
	});

	let activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		triggerUpdateDecorations();
	}

	// vscode.window.onDidChangeTextEditorSelection
	// (
	// 	editor =>
	// 	{
	// 		const a: vscode.Selection[] = editor.selections
	// 		const b = 5;
	// 	},
	// 	null, 
	// 	context.subscriptions
	// );

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

    // let timeout : NodeJS.Timer | null = null;
    var timeout:any = null;
	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(updateDecorations, 500);
	}

	function updateDecorations() 
	{
		if (!activeEditor) 
			return;

		//read configuration
		const configuration = vscode.workspace.getConfiguration('regionsWithColors');

		//set default color and region box flag
		let regionColor: string;
		let regionBox: boolean;

		//read color and overwrite the default value (if it is present)
		//not sure if the "if"s are needed
		if(configuration && configuration.color)
			regionColor = configuration.color;

		if(configuration && configuration.box)
			regionBox = configuration.box;

		//dispose current decorations (this ensures that we don't apply a new decoration while the old one is still there)
		regionDecoration.dispose();
		//boxRegionDecoration.dispose();

		//create a new decoration with the our color
		regionDecoration = vscode.window.createTextEditorDecorationType
		({
			isWholeLine: true,
			backgroundColor: regionColor,
		}); 

		//this regex exression either finds "#region" or "#endregion"
		const regExBoth = /(#region.*)|(#endregion.*)/g;
		const document = activeEditor.document;
		const text = document.getText();
		const regionsToDecorate: vscode.DecorationOptions[] = [];
		const regionsTagsToDecorate: vscode.DecorationOptions[] = [];
		let match;

		//stores the position of #region and #endregion
		const position: vscode.Position[] = [];

		//stores the type. true = #region, false = #endregion
		const type: boolean[] = []; 

		//this while loop populates the two arrays: position and type
		while (match = regExBoth.exec(text))
		{
			const tempMatch:string = match[0];

			if(tempMatch.includes('#region'))
			{
				const pos = activeEditor.document.positionAt(match.index);
				// const lineText = document.lineAt(pos.line).text
				position.push(pos);
				type.push(true);
			}
			else
			{
				const pos = activeEditor.document.positionAt(match.index + match[0].length);
				position.push(pos);
				type.push(false);
			}

			if(regionBox)
			{
				const startPos = activeEditor.document.positionAt(match.index);
				const endPos = activeEditor.document.positionAt(match.index + match[0].length);
				const tagDecoration = { range: new vscode.Range(startPos, endPos)};
				regionsTagsToDecorate.push(tagDecoration);
			}
		}

		//now calculate areas to be decorated
		//but only if number of "tags" is even
		if(position.length % 2 == 0)
		{
			//go through all tags
			for (var _i = 0; _i < position.length; _i++) 
			{
				//if we're opening a region...
				if(type[_i])
				{
					//...find the end of that region
					let indentValue = 0;

					//go through remaining tags ahead of this one
					for (var _t = _i + 1; _t < position.length; _t++) 
					{
						//check if it's the actual end
						if(!type[_t] && indentValue == 0)
						{
							const decoration = { range: new vscode.Range(position[_i], position[_t])};
							regionsToDecorate.push(decoration);
							break;
						}
						//check if it's an open tag
						else if(type[_t])
							indentValue++;
						//check if it's a close tag and we opened another one previously
						else if(!type[_t] && indentValue > 0)
							indentValue--;
					}
				}
			}
		}

		activeEditor.setDecorations(regionDecoration, regionsToDecorate);
		
		if(regionBox)
			activeEditor.setDecorations(boxRegionDecoration, regionsTagsToDecorate);
	}
}
