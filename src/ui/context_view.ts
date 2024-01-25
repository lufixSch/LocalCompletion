import {
  FileType,
  TreeDataProvider,
  TreeItem,
  TreeItemCheckboxState,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
  EventEmitter,
  Event,
  ExtensionContext,
  TreeView,
  Disposable,
  TreeCheckboxChangeEvent,
  ConfigurationTarget,
} from 'vscode';

export class ContextItem extends TreeItem {
  constructor(
    public path: string,
    public isFile: boolean,
    public name: string
  ) {
    super(
      name,
      isFile
        ? TreeItemCollapsibleState.None
        : TreeItemCollapsibleState.Collapsed
    );

    this.tooltip = path;
    this.checkboxState = ContextItem.checkStatus(path)
      ? TreeItemCheckboxState.Checked
      : TreeItemCheckboxState.Unchecked;
    this.resourceUri = Uri.file(path);
  }

  static checkStatus(path: string) {
    return workspace
      .getConfiguration('localcompletion')
      .get<string[]>('context_files', [])
      .includes(path);
  }
}

export class ContextSelectionProvider implements TreeDataProvider<ContextItem> {
  private _onDidChangeTreeData: EventEmitter<
    ContextItem | undefined | null | void
  > = new EventEmitter<ContextItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<ContextItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string | undefined) {
    workspace.onDidCreateFiles(() => this._onDidChangeTreeData.fire());
    workspace.onDidDeleteFiles(() => this._onDidChangeTreeData.fire());
    workspace.onDidRenameFiles(() => this._onDidChangeTreeData.fire());
  }

  getTreeItem(element: ContextItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: ContextItem | undefined): Thenable<ContextItem[]> {
    if (!this.workspaceRoot) {
      window.showInformationMessage(
        'Unable to extend context in empty workspace!'
      );
      return Promise.resolve([]);
    }

    if (!element) {
      return Promise.resolve(this.getFilesInDirectory(this.workspaceRoot));
    }

    if (!element.isFile) {
      return Promise.resolve(this.getFilesInDirectory(element.path));
    }

    return Promise.resolve([]);
  }

  /** Get all files and directories at a given path */
  async getFilesInDirectory(path: string) {
    const files = await workspace.fs.readDirectory(Uri.file(path));

    return files
      .map(([f, fileType]) => {
        return new ContextItem(path + '/' + f, fileType === FileType.File, f);
      })
      .sort((a, b) => Number(a.isFile) - Number(b.isFile));
  }

  /** Get all files in a given directory and subdirectories as a flat array */
  async getFilesRecursive(path: string): Promise<ContextItem[]> {
    const files = await workspace.fs.readDirectory(Uri.file(path));

    const items = await Promise.all(
      files.map(async ([f, fileType]) => {
        if (fileType === FileType.Directory) {
          const dirFiles = await this.getFilesRecursive(path + '/' + f);
          return dirFiles;
        }

        return new ContextItem(path + '/' + f, true, f);
      })
    );

    return items.flat();
  }
}

export class ContextSelectionView implements Disposable {
  private treeView: TreeView<ContextItem>;
  private provider: ContextSelectionProvider;

  constructor(private context: ExtensionContext) {
    const rootPath =
      workspace.workspaceFolders && workspace.workspaceFolders.length > 0
        ? workspace.workspaceFolders[0].uri.fsPath
        : undefined;

    this.provider = new ContextSelectionProvider(rootPath);
    this.treeView = window.createTreeView('contextSelection', {
      treeDataProvider: this.provider,
    });

    this.treeView.onDidChangeCheckboxState((e) => this.checkFiles(e));
  }

  private async checkFiles(event: TreeCheckboxChangeEvent<ContextItem>) {
    const contextItemsStack = await Promise.all(
      event.items.map(async ([item, checked]) => {
        if (item.isFile) {
          item.checkboxState = checked
            ? TreeItemCheckboxState.Checked
            : TreeItemCheckboxState.Unchecked;
          return item;
        }

        return (await this.provider.getFilesRecursive(item.path)).map(
          (item) => {
            item.checkboxState = checked
              ? TreeItemCheckboxState.Checked
              : TreeItemCheckboxState.Unchecked;
            return item;
          }
        );
      })
    );

    const contextItems = contextItemsStack.flat();
    this.updateSelectedContext(contextItems);
  }

  private updateSelectedContext(contextItems: ContextItem[]) {
    const config = workspace
      .getConfiguration('localcompletion')
      .get<string[]>('context_files', []);

    contextItems.forEach((item) => {
      const path = item.path;
      if (
        item.checkboxState === TreeItemCheckboxState.Checked &&
        !config.includes(path)
      ) {
        config.push(path);
      } else if (
        item.checkboxState === TreeItemCheckboxState.Unchecked &&
        config.includes(path)
      ) {
        config.splice(config.indexOf(path), 1);
      }
    });

    workspace
      .getConfiguration('localcompletion')
      .update('context_files', config, ConfigurationTarget.Workspace);
  }

  dispose() {
    this.treeView.dispose();
  }
}
