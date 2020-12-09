import { join } from 'path';
import { existsasync } from '../util/fs';

export async function get_pages(rootPath: string) {
	const pages = join(rootPath, 'pages');
	if (await existsasync(join(pages, '_app.tsx'))) {
		return pages;
	}
	const src = join(rootPath, 'src', 'pages');
	if (await existsasync(join(src, '_app.tsx'))) {
		return src;
	}
	return false;
}
