import { basename, dirname, extname, join, relative } from 'path';
import { Disposable, FileType, QuickPickItem, TextEditor, Uri, window, workspace } from 'vscode';
import Tools from './tools';
import { IAtom, IAtomCatagory } from './interfaces';

export default abstract class Base extends Tools {
	public async finddoc() {
		const root = this.root();
		// if (!root) {
		// 	return;
		// }
		const src = join(root, 'src');
		const files = await this.getallfiles(src);
		const tsfiles = files.sort((a, b) => {
			// return a - b;
			if (a > b) {
				return 1;
			}
			if (a < b) {
				return -1;
			}
			return 0;
		}).filter((file) => {
			const ext = extname(file);
			if (!/^\.tsx?$/.test(ext)) {
				return false;
			}
			const name = basename(file, ext);
			return /^((a|pg|s|c|)\d{3,}|\[.+])$/.test(name);
		});
		const options = Promise.all(tsfiles.map(async (file) => {
			const doc = await this.readdoc(file);
			const path = this.getrelativepath(src, file);
			return {
				label: doc,
				detail: path,
				path: file
			};
		}));
		const picked = await this.pick(options);
		if (!picked) {
			return;
		}
		await this.show_doc(picked.path);
	}

	public abstract addwidgetlocal(): Promise<void>;
	public abstract addwidget(): Promise<void>;
	public abstract addatom(): Promise<void>;

	public abstract addtplwidget(editor: TextEditor): Promise<void>;
	public async addtplatom(editor: TextEditor) {
		const catagories_remote = new Map<string, IAtom[]>();
		const all_remote = new Map<string, IAtom>();
		const remote_atoms = await this.getremoteatoms();
		remote_atoms.forEach((it) => {
			catagories_remote.set(it.catagory, it.atoms);
			it.atoms.forEach((atom) => {
				all_remote.set(atom.no, atom);
			});
		});
		const root_path = this.root(editor);

		const local_atoms = await (async (root) => {
			try {
				const atom_dir = join(root, 'src', 'atoms');
				const atoms_dirs = await workspace.fs.readDirectory(Uri.file(atom_dir));
				const ps = atoms_dirs.filter(([ad, type]) => {
					if (type === FileType.Directory) {
						return false;
					}
					return ad.startsWith('a');
				}).map(async ([p]) => {
					const path = join(atom_dir, p);
					const doc = await this.readdoc(path);
					const no = p.replace(/\.tsx?/, '');
					return {
						name: doc,
						no,
						local: true
					} as IAtom;
				});
				return Promise.all(ps);
			} catch {
				return [];
			}
		})(root_path);

		const catagories = new Map<string, IAtom[]>();
		catagories.set('本地', local_atoms);
		catagories_remote.forEach((v, k) => {
			catagories.set(k, v);
		});
		const all = new Map<string, IAtom>();
		local_atoms.forEach((atom) => {
			all.set(atom.no, atom);
		});
		all_remote.forEach((v, k) => {
			all.set(k, v);
		});
		const selects = Array.from(catagories.keys()).map((catagory) => {
			const item: QuickPickItem = {
				label: catagory
			};
			return item;
		}).concat(Array.from(all.values()).map((atom) => {
			const item: QuickPickItem = {
				detail: atom.name,
				label: atom.no
			};
			return item;
		}));
		const picked = await this.pick(selects, '选择一个分类或直接输入原子操作编号并回车');
		if (!picked) {
			return;
		}
		const atom = await (async () => {
			const pick = all.get(picked.label);
			if (pick) {
				return pick;
			}
			const atoms = catagories.get(picked.label)!;
			const selected_atom = await this.pick(atoms.map((it) => {
				const item: QuickPickItem = {
					detail: it.name,
					label: it.no
				};
				return item;
			}), '选择一个原子操作编号并回车');
			if (!selected_atom) {
				return null;
			}
			return all.get(selected_atom.label);
		})();
		if (!atom) {
			return;
		}
		if (atom.local) {
			const atomfile = join(root_path, 'src', 'atoms', atom.no);
			const cur = dirname(editor.document.uri.fsPath);
			const imp_path = relative(cur, atomfile);
			const name = atom.no.replace(/(@.+\/)?([a-z]+)0+(\d+)/, '$2$3');
			const imp = `import ${name} from '${imp_path}';`;

			const use = `${name}($1)`;

			await this.insetSnippet(editor, use, imp);
			return;
		}
		await this.shellinstall(editor, atom.no, atom.version);

		const name = atom.no.replace(/(@.+\/)?([a-z]+)0+(\d+)/, '$2$3');
		const imp = `import ${name} from '${atom.no}';`;
		const dir = join(root_path, 'node_modules', atom.no);
		const snippet_use = Uri.file(join(dir, 'use.snippet'));

		try {
			await workspace.fs.stat(snippet_use);
		} catch (error) {
			this.showerror('无法自动添加脚本，请联系供应商');
			return;
		}
		const use = Buffer.from(await workspace.fs.readFile(snippet_use)).toString('utf8');

		await this.insetSnippet(editor, use, imp);
	}
	protected abstract getremoteatoms(): Promise<IAtomCatagory[]>;

	public abstract shellcreate(cwd: string, no: string, desc: string): Promise<void>;
	public abstract shellbuild(): void;
	public abstract shelldebug(): void;

	public abstract completion(): Disposable;

	public abstract addpage(): Promise<void>;
	public abstract addcomponent(editor: TextEditor): Promise<void>;
	public abstract addservice(): Promise<void>;
	public abstract addatomlocal(editor: TextEditor): Promise<void>;

	protected async replacefile(path: string, src: Array<{ [Symbol.replace](src: string, rep: string): string; }>, rep: string[]) {
		const uri = Uri.file(path);
		const content = Buffer.from(await workspace.fs.readFile(uri)).toString('utf8');
		const result = src.reduce((pre, cur, i) => {
			return pre.replace(cur, rep[i]);
		}, content);
		if (content !== result) {
			await workspace.fs.writeFile(uri, Buffer.from(result, 'utf-8'));
		}
	}

	protected async baseaddservice() {
		const path = (() => {
			const editor = window.activeTextEditor;
			if (!editor) {
				const wfs = workspace.workspaceFolders;
				if (!wfs || wfs.length === 0) {
					throw new Error('Please make sure you have a project opend');
				}
				return join(wfs[0].uri.fsPath, 'src');
			}
			return editor.document.fileName;
		})();
		let folder = dirname(path);
		if (!folder.includes('src')) {
			folder = join(folder, 'src');
			await this.mkdir(folder);
		}
		const name = await this.generate(folder, 's', 3);
		const p_path = await this.create_s(folder, name);
		await workspace.saveAll();
		await this.show_doc(p_path);
	}
	private async create_s(folder: string, no: string) {
		const path = join(folder, `${no}.ts`);
		const dir = path.replace(/.*src[/|\\]/, '');
		const tpl = `import an1 from '@mmstudio/an000001';
import an4 from '@mmstudio/an000004';

interface Message {
	// cookies: {
	// 	uk: string;
	// 	[key: string]: string
	// };
	// urls: {
	// 	base: string;
	// 	origin: string;
	// 	url: string;
	// };
	// query: {};
	// params: {};
	// headers: {};
	// captcha: string;
}

export default async function ${no}(msg: Message, actionid: string): Promise<an4> {
	an1(\`Service begin path:${dir},actionid:$\{actionid}\`);

	an1(\`Service end path:${dir},actionid:$\{actionid}\`);
	return {
		data: '"mm"'
	} as an4;
}
`;
		await this.writefile(path, tpl);
		return path;
	}
	protected async baseaddatomlocal(editor: TextEditor) {
		const uri = editor.document.uri;
		const folder = dirname(uri.fsPath);
		const a = await this.generate(folder, 'a', 3);
		const p_path = join(folder, `${a}.ts`);
		const tpl = `
export default function ${a}() {
	// todo
}
`;
		await this.writefile(p_path, tpl);
		await this.show_doc(p_path);
	}
}
