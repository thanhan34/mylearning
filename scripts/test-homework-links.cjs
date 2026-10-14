const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/homework-links.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = { exports: {} };
new Function('exports', 'require', 'module', compiled.outputText)(loaded.exports, require, loaded);
const { parseHomeworkLinks: parse, homeworkLinkKey: key } = loaded.exports;
const url = (model, id = '123') => `https://www.apeuni.com/practice/answer_item?model=${model}&answer_id=${id}`;
const models = ['read_alouds', 'repeat_sentences', 'describe_images', 'retell_lectures', 'core_swts', 'write_emails', 'core_ssts', 'summarize_group_discussions', 'respond_situations'];
assert.equal(parse(models.map(model => url(model)).join('\n')).length, 9);
assert.ok(parse(models.map(model => url(model)).join('\n')).every(item => item.type && !item.error));
assert.equal(parse(`RA (C)#338 shared an answer\nAPEUni AI Score 67/90 ${url('read_alouds')}\nRS#5 ${url('repeat_sentences')}`)[1].type, 'Repeat sentence');
assert.equal(parse(`ra(c)#1 APEUni https://apeuni.com/practice/answer_item?answer_id=1`)[0].type, 'Read aloud');
assert.ok(parse(`DI#1 ${url('read_alouds')}`)[0].error);
assert.ok(parse('https://apeuni.com.evil.test/?model=read_alouds')[0].error);
assert.ok(parse('https://example.com/?model=read_alouds')[0].error);
assert.ok(parse(url('unknown'))[0].error);
assert.ok(parse('not a link')[0].error);
assert.ok(parse('https://%')[0].error);
assert.deepEqual(parse('  '), []);
assert.equal(parse(`${url('read_alouds')} ${url('describe_images')}`).length, 2);
assert.equal(key(`RA#1 ${url('read_alouds')}`), key('https://apeuni.com/en/practice/answer_item?answer_id=123&model=read_alouds'));
assert.notEqual(key(url('read_alouds', '1')), key(url('read_alouds', '2')));
assert.equal(parse(`(${url('read_alouds')}).`)[0].url, url('read_alouds'));
const newModels = {
  swts: 'Summarize Written Text', essays: 'Write Essay',
  ssts: 'Summarize Spoken Text', ptea_respond_situations: 'Respond to a situation',
};
for (const [model, type] of Object.entries(newModels)) {
  assert.equal(parse(url(model))[0].type, type);
  assert.equal(parse(url(model))[0].error, undefined);
}
const pasted = `SWT#516 APEUni  PTEA SWT V2.0 AI Score 8.5/9 https://www.apeuni.com/practice/answer_item?model=swts&answer_id=4253495111RTS#230 APEUni  RTS V3.0 AI Score 87/90 https://www.apeuni.com/practice/answer_item?model=ptea_respond_situations&answer_id=4253496817
SST#751 APEUni  PTEA SST V3.0 AI Score 4.1/12 https://www.apeuni.com/practice/answer_item?model=ssts&answer_id=4253502064
WE#472 APEUni  Essay V2.0 AI Score 10.2/26 https://www.apeuni.com/practice/answer_item?model=essays&answer_id=4253502813`;
const parsed = parse(pasted);
assert.equal(parsed[0].title, 'SWT#516 APEUni PTEA SWT V2.0 AI Score 8.5/9');
assert.equal(parsed[1].title, 'RTS#230 APEUni RTS V3.0 AI Score 87/90');
assert.equal(parsed[2].title, 'SST#751 APEUni PTEA SST V3.0 AI Score 4.1/12');
assert.equal(parsed[3].title, 'WE#472 APEUni Essay V2.0 AI Score 10.2/26');
assert.equal(parse(url('ssts'))[0].title, undefined);
assert.equal(parse(`SST#144 shared an answer\nAPEUni AI Score 12/12 ${url('ssts')}`)[0].title, 'SST#144 shared an answer APEUni AI Score 12/12');
assert.deepEqual(parsed.map(item => item.type), [newModels.swts, newModels.ptea_respond_situations, newModels.ssts, newModels.essays]);
assert.ok(parsed.every(item => !item.error));
assert.deepEqual(parsed.map(item => new URL(item.url).searchParams.get('answer_id')), ['4253495111', '4253496817', '4253502064', '4253502813']);
assert.equal(key(pasted), key(url('swts', '4253495111')));
assert.ok(parse(`SWT#516 ${url('essays')}`)[0].error);
assert.equal(parse(`SWT (C)#516 shared an answer\nAPEUni AI Score 8.5/9 ${url('swts')}`)[0].type, newModels.swts);
assert.ok(parse(`${url('swts')}WE#472 ${url('essays')}`).every(item => !item.error));
const expectedHeading = 'SST#144 APEUni PTEA SST V3.0 AI Score 12/12';
const sharedAnswer = parse(`${expectedHeading} ${url('ssts')}`)[0];
assert.equal(sharedAnswer.title, expectedHeading);
// The same heading survives saving and reading the submission again.
assert.equal(parse(`${sharedAnswer.title} ${sharedAnswer.url}`)[0].title, expectedHeading);
assert.equal(parse(`SST # 144 APEUni PTEA SST V3.0 AI Score 12/12 ${url('ssts')}`)[0].title,
  'SST # 144 APEUni PTEA SST V3.0 AI Score 12/12');
assert.equal(parse(`Essay APEUni AI Score 10/26 ${url('essays')}`)[0].title, 'Essay APEUni AI Score 10/26');
assert.equal(parse(`(${url('ssts')})`)[0].title, undefined);
assert.equal(parse(`${url('ssts')}\n${url('essays')}`)[1].title, undefined);
console.log('Homework link parser: all assertions passed.');