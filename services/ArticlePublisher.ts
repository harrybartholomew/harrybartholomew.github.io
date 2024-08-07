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

import PagePublisher from './PagePublisher';
import ArticleMetaInfo from './classes/ArticleMetaInfo';
import Article from './classes/Article';
import ArticleModel from './models/ArticleModel';

class ArticlePublisher {
  // A path of the directory containing markdown article files.
  static ARTICLE_ORIGIN_PATH: string = path.join(__dirname, '../_articles');

  // A path of the directory containing HTML article files.
  static ARTICLE_DIST_PATH: string = path.join(__dirname, '../app/public/article');

  // A path of the article template file.
  static ARTICLE_TEMPLATE: Buffer = fs.readFileSync(path.join(__dirname, '../app/templates/article.ejs'));

  static IGNORED_FILES: string[] = ['.DS_Store'];

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
      return `<pre class="hljs"><code>${ArticlePublisher.md.utils.escapeHtml(str)}</code></pre>`;
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
          return `<details><summary>${ArticlePublisher.md.utils.escapeHtml(content[1])}</summary>\n`;
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
   * Returns an article in article directory as object by filename.
   *
   * @param filename - An article filename.
   */
  private static getArticleByFilename(filename: string) {
    const mdContent = String(fs.readFileSync(`${this.ARTICLE_ORIGIN_PATH}/${filename}`));
//     const mdContentWithToc = `::: toggle(Table of Contents)\n[[toc]]\n:::\n${mdContent}`;
    const mdContentWithoutToc = mdContent.replace(/::: toggle\(Table of Contents\)[\s\S]*?:::/g, '');
//     const htmlContent: string = this.md.render(this.extractContent(mdContentWithToc));
    const htmlContent: string = this.md.render(this.extractContent(mdContentWithoutToc));
    const metaInfo: ArticleMetaInfo = this.extractMetaInfo(String(mdContent));

    return new Article({
      id: metaInfo.getId(),
      author: metaInfo.getAuthor(),
      title: metaInfo.getTitle(),
      subtitle: metaInfo.getSubtitle(),
      date: metaInfo.getDate(),
      tags: metaInfo.getTags(),
      url: metaInfo.getUrl(),
      content: htmlContent,
    });
  }

  /**
   * Extracts an article meta information in front matter block from text.
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
  public static extractMetaInfo(text: string): ArticleMetaInfo {
    const metaInfo: ArticleMetaInfo = new ArticleMetaInfo();
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

        metaInfo.setProp(key, value);
      }
    });

    return metaInfo;
  }

  /**
   * Converts markdown article files to HTML files.
   *
   * @param id - A specific article ID. If not given, publishes all articles.
   */
  public static publishArticles(id?: number) {
    const articleFiles: string[] = fs.readdirSync(this.ARTICLE_ORIGIN_PATH)
      .filter((file) => !this.IGNORED_FILES.includes(file));

    const distArticles: ArticleModel[] = articleFiles.map((articleFile: string, index: number) => {
      const article = ArticlePublisher.getArticleByFilename(articleFile).getArticle();
      const nextArticle = articleFiles[index + 1]
          && ArticlePublisher.getArticleByFilename(articleFiles[index + 1]).getArticle();
      const prevArticle = articleFiles[index - 1]
          && ArticlePublisher.getArticleByFilename(articleFiles[index - 1]).getArticle();

      if (id) {
        if (article.id === id) {
          console.log(`* ${article.id}: ${article.title}`);
          fs.writeFileSync(
            `${this.ARTICLE_DIST_PATH}/${article.id}.html`,
            ejs.render(String(this.ARTICLE_TEMPLATE), {
              article,
              nextArticle,
              prevArticle,
            }),
          );
        }

        return article;
      }

      fs.writeFileSync(
        `${this.ARTICLE_DIST_PATH}/${article.id}.html`,
        ejs.render(String(this.ARTICLE_TEMPLATE), {
          article,
          nextArticle,
          prevArticle,
        }),
      );

      console.log(`* ${article.id}: ${article.title}`);
      return article;
    });

    PagePublisher.publishArticles(distArticles);
  }
}

export default ArticlePublisher;
