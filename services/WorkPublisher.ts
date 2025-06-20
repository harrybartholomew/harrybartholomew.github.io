/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */


import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';

import MarkdownIt from 'markdown-it';
import * as katex from 'katex';
import highlightJs from 'highlight.js';
import mdFootnote from 'markdown-it-footnote';
import mdTex from 'markdown-it-texmath';
import mdAnchor from 'markdown-it-anchor';
import mdTableOfContents from 'markdown-it-table-of-contents';
import mdContainer from 'markdown-it-container';
import mdInlineComment from 'markdown-it-inline-comments';
import mdLazyImage from 'markdown-it-image-lazy-loading';
import mdMermaid from 'markdown-it-mermaid';

import WorkMetaInfo from './classes/WorkMetaInfo';
import Work from './classes/Work';
import WorkModel from './models/WorkModel';
import PagePublisher from './PagePublisher';

class WorkPublisher {
  // A path of the directory containing the markdown works files.
  static WORK_ORIGIN_PATH: string = path.join(__dirname, '../_works');

  // A path of the directory containing the HTML works files.
  static WORK_DIST_PATH: string = path.join(__dirname, '../app/public/work');

  // A path of the works template file.
  static WORK_TEMPLATE: Buffer = fs.readFileSync(path.join(__dirname, '../app/templates/work.ejs'));

  static md: MarkdownIt = new MarkdownIt({
    html: false,
    xhtmlOut: false,
    breaks: false,
    langPrefix: 'language-',
    linkify: true,
    typographer: true,
    quotes: '“”‘’',
    highlight: (str, language) => {
      if (language && highlightJs.getLanguage(language)) {
        return `<pre class="hljs"><code>${highlightJs.highlight(str, { language }).value}</code></pre>`;
      }
      return `<pre class="hljs"><code>${WorkPublisher.md.utils.escapeHtml(str)}</code></pre>`;
    },
  }).use(mdFootnote)
    .use(mdInlineComment)
    .use(mdMermaid)
    .use(mdTex.use(katex), {
      delimiters: 'gitlab',
    })
    .use(mdAnchor)
//     .use(mdTableOfContents, {
//       includeLevel: [1, 2, 3],
//     })
    .use(mdContainer, 'toggle', {
      validate(params) {
        return params.trim().match(/^toggle\((.*)\)$/);
      },
      render(tokens, idx) {
        const content = tokens[idx].info.trim().match(/^toggle\((.*)\)$/);
        if (tokens[idx].nesting === 1) {
          return `<details><summary>${WorkPublisher.md.utils.escapeHtml(content[1])}</summary>\n`;
        }
        return '</details>\n';
      },
    })
    .use(mdLazyImage, {
      decoding: true,
      image_size: true,
      base_path: path.join(__dirname, '../'),
    });

  /**
   * Extracts content excluding front matter block.
   *
   * # Example
   *
   * ```js
   * const text = '---\nid: 0\ntitle: "Lorem ipsum"\n---\nSed sit amet arcu a diam tincidunt porta';
   * console.log(extractContent(text)); // 'Sed sit amet arcu a diam tincidunt porta'
   * ```
   *
   * @param text - Any text containing front matter block.
   */
  private static extractContent(text: string): string {
    return text.replace(/(-{3})([\s\S]+?)(\1)/, '');
  }

  /**
   * Extracts an works meta information in front matter block from text.
   *
   * ```js
   * const text = '---\nid: 0\ntitle: "Lorem ipsum"\n---\nSed sit amet arcu a diam tincidunt porta';
   * const metaInfo = extractMetaInfo(text);
   *
   * console.log(metaInfo.getId()); // 0
   * console.log(metaInfo.getTitle()); // 'Lorem ipsum'
   * ```
   *
   * @param text - Any text containing front matter block.
   */
  private static extractMetaInfo(text: string): WorkMetaInfo {
    const metaInfo: WorkMetaInfo = new WorkMetaInfo();
    const metaInfoLines: string[] = text.match(/(-{3})([\s\S]+?)(\1)/)[2]
      .match(/[^\r\n]+/g);

    if (!metaInfoLines) {
      return null;
    }

    metaInfoLines.forEach((metaInfoLine: string) => {
      const kvp: string[] = metaInfoLine.match(/(.+?):(.+)/);

      if (kvp) {
        const key: string = kvp[1].replace(/\s/g, '');
        const value: string = kvp[2].replace(/['"]/g, '').trim();

        metaInfo.setMetaInfoProp(key, value);
      }
    });

    return metaInfo;
  }

  /**
   * Converts markdown works files to HTML files.
   */
  public static publishAllWorks() {
    const workFiles: string[] = fs.readdirSync(this.WORK_ORIGIN_PATH);

    const distWorks: WorkModel[] = workFiles.map((workFile: string, idx: number) => {
      const mdContent: Buffer = fs.readFileSync(`${this.WORK_ORIGIN_PATH}/${workFile}`);
      const htmlContent: string = this.md.render(this.extractContent(String(mdContent)));
      const metaInfo: WorkMetaInfo = this.extractMetaInfo(String(mdContent));

      const work: Work = new Work({
        id: idx,
        title: metaInfo.getTitle(),
        subtitle: metaInfo.getSubtitle(),
        thumbnail: metaInfo.getThumbnail(),
        content: htmlContent,
      });

      fs.writeFileSync(
        `${this.WORK_DIST_PATH}/${idx}.html`,
        ejs.render(String(this.WORK_TEMPLATE), work.getWork()),
      );

      console.log(`* ${idx}: ${metaInfo.getTitle()}`);
      return work.getWork();
    });

    PagePublisher.publishWorks(distWorks);
  }
}

export default WorkPublisher;
