import * as k from './index';
import { strict as t } from 'assert';
import * as pty from 'node-pty';
import * as child_process from 'child_process';

function columnize(arr: string[], count: number = 16): string {
	let out = '';
	for (let i = 0; i < arr.length; i++) {
		out += arr[i];
		if ((i + 1) % count === 0) {
			out += '\n';
		}
	}

	return out;
}

describe('colors', () => {
	beforeEach(() => {
		k.options.enabled = true; // Always enable colors, even in CLI environments
		k.options.supportLevel = k.SupportLevel.ansi256;
	});

	it('should print colors', () => {
		t.equal(k.cyan('foo'), '\u001b[36mfoo\u001b[39m');
	});

	it('should nest colors', () => {
		t.equal(
			k.green(`foo ${k.lightCyan('bar')} bob`),
			'\u001b[32mfoo \u001b[96mbar\u001b[32m bob\u001b[39m'
		);
	});

	it('should nest background colors', () => {
		t.equal(
			k.bgYellow(`foo ${k.bgGray('bar')} bob`),
			'\u001b[43mfoo \u001b[100mbar\u001b[43m bob\u001b[49m'
		);
	});

	it('should print demo', () => {
		const strs = Object.keys(k)
			.filter(
				key =>
					![
						'options',
						'ansi256',
						'ansi256Bg',
						'link',
						'SupportLevel',
						'trueColor',
						'trueColorBg',
					].includes(key)
			)
			.map(x => (k as any)[x]('foobar'));

		console.log(columnize(strs, 16));
	});

	describe('ansi256', () => {
		it('should print foreground demo', () => {
			const strs = new Array(256).fill(0).map((_, i) => k.ansi256(i)('foo'));
			console.log(columnize(strs, 16));
		});

		it('should print background demo', () => {
			const strs = new Array(256).fill(0).map((_, i) => k.ansi256Bg(i)('foo'));
			console.log(columnize(strs, 16));
		});

		it('should mix with modifiers', () => {
			const strs = new Array(256)
				.fill(0)
				.map((_, i) => k.dim(k.ansi256(i)('foo')));
			console.log(columnize(strs, 16));
		});

		it('should be stripped', () => {
			t.equal(k.stripColors(k.ansi256(194)('foo')), 'foo');
		});

		it('should be ignored if no terminal support', () => {
			k.options.supportLevel = k.SupportLevel.ansi;
			t.equal(JSON.stringify(k.ansi256(194)('foo')), JSON.stringify('foo'));
		});
	});

	describe('TrueColor 24bit', () => {
		beforeEach(() => {
			k.options.supportLevel = k.SupportLevel.trueColor;
		});

		it('should print foreground', () => {
			const str = k.trueColor(134, 239, 172)('foo');
			console.log(str);
		});

		it('should print background', () => {
			const str = k.trueColorBg(134, 239, 172)('foo');
			console.log(str);
		});

		it('should mix with modifiers', () => {
			console.log(k.dim(k.trueColor(134, 239, 172)('foo')));
			console.log(k.dim(k.trueColorBg(134, 239, 172)(k.black('foo'))));
		});

		it('should be stripped', () => {
			t.equal(k.stripColors(k.trueColor(134, 239, 172)('foo')), 'foo');
		});

		it('should be ignored if no terminal support', () => {
			k.options.supportLevel = k.SupportLevel.ansi;
			t.equal(
				JSON.stringify(k.trueColor(134, 239, 172)('foo')),
				JSON.stringify('foo')
			);
		});

		it('should convert color space to ansi256 if possible', () => {
			k.options.supportLevel = k.SupportLevel.ansi256;
			t.equal(k.trueColor(134, 239, 172)('foo'), k.ansi256(157)('foo'));
			t.equal(k.trueColorBg(134, 239, 172)('foo'), k.ansi256Bg(157)('foo'));
		});
	});

	it('should toggle enabled or disabled', () => {
		k.options.enabled = true;
		t.equal(k.cyan('foo'), '\u001b[36mfoo\u001b[39m');

		k.options.enabled = false;
		t.equal(k.cyan('foo'), 'foo');

		k.options.enabled = true;
		t.equal(k.cyan('foo'), '\u001b[36mfoo\u001b[39m');
	});
});

describe('color switch', () => {
	it('should be enabled in terminals by default', done => {
		let output = '';
		const term = pty.spawn(
			process.execPath,
			[
				'-r',
				'@esbuild-kit/cjs-loader',
				'-e',
				'console.log(require("./index.ts").blue("foo"))',
			],
			{
				name: 'test with pseudo tty',
				cols: 80,
				rows: 30,
				cwd: __dirname,
				env: {},
			}
		);
		term.onData(data => (output += data));
		term.onExit(() => {
			t.equal(
				JSON.stringify(output.trim()),
				JSON.stringify('\x1B[34mfoo\x1B[39m')
			);
			done();
		});
	}).timeout(20000); // typescript is slow

	it('should be disabled in non-interactive terminals', done => {
		let output = '';
		const subprocess = child_process.spawn(
			process.execPath,
			[
				'-r',
				'@esbuild-kit/cjs-loader',
				'-e',
				'console.log(require("./index.ts").blue("foo"))',
			],
			{
				cwd: __dirname,
				stdio: 'pipe',
				env: {},
			}
		);
		subprocess.stdout.on('data', data => (output += data));
		subprocess.stderr.on('data', data => (output += data));
		subprocess.on('exit', () => {
			t.equal(JSON.stringify(output.trim()), JSON.stringify('foo'));
			done();
		});
	}).timeout(20000); // typescript is slow

	it('should be disabled when TERM=dumb', done => {
		let output = '';
		const subprocess = child_process.spawn(
			process.execPath,
			[
				'-r',
				'@esbuild-kit/cjs-loader',
				'-e',
				'console.log(require("./index.ts").blue("foo"))',
			],
			{
				cwd: __dirname,
				env: {
					TERM: 'dumb',
				},
				stdio: 'pipe',
			}
		);
		subprocess.stdout.on('data', data => (output += data));
		subprocess.stderr.on('data', data => (output += data));
		subprocess.on('exit', () => {
			t.equal(JSON.stringify(output.trim()), JSON.stringify('foo'));
			done();
		});
	}).timeout(20000); // typescript is slow

	it('should be enabled in CI environments', done => {
		let output = '';
		const subprocess = child_process.spawn(
			process.execPath,
			[
				'-r',
				'@esbuild-kit/cjs-loader',
				'-e',
				'console.log(require("./index.ts").blue("foo"))',
			],
			{
				cwd: __dirname,
				env: {
					CI: 'true',
					GITLAB_CI: 'true',
				},
				stdio: 'pipe',
			}
		);
		subprocess.stdout.on('data', data => (output += data));
		subprocess.stderr.on('data', data => (output += data));
		subprocess.on('exit', () => {
			t.equal(JSON.stringify(output.trim()), JSON.stringify(k.blue('foo')));
			done();
		});
	}).timeout(20000); // typescript is slow
});

describe('strip colors', () => {
	it('should remove colors from string', () => {
		t.equal(k.stripColors(k.red('foo')), 'foo');
	});

	it('should strip link', () => {
		t.equal(k.stripColors(k.link('foo', 'foo')), 'foo');
	});
});

describe('links', () => {
	it('should render links', () => {
		t.equal(
			k.link('my link', 'https://example.com'),
			'\u001b]8;;https://example.com\u0007my link\u001b]8;;\u0007'
		);

		k.options.enabled = false;
		t.equal(
			k.link('my link', 'https://example.com'),
			'my link (\u200Bhttps://example.com\u200B)'
		);
		k.options.enabled = true;
	});
});
