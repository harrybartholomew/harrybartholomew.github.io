import ArticleMetaInfoModel from '../models/ArticleMetaInfoModel';

class ArticleMetaInfo implements ArticleMetaInfoModel {
  id: number;

  title: string;

  author: string;

  subtitle?: string;

  date: string;

  tags: string | string[];

  url?: string;

  setProp(name: string, value: any) {
    switch (name) {
      case 'id':
        this.id = Number(value);
        break;

      case 'title':
      case 'author':
      case 'subtitle':
      case 'date':
      case 'url':

      case 'tags':
        this[name] = value;
        break;

      default:
        throw new Error(`Unkown property '${name}'.`);
    }
  }

  getId(): number {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getSubtitle(): string {
    return this.subtitle;
  }

  getDate(): string {
    return this.date;
  }

  getAuthor(): string {
    return this.author
  }

  getTags(): string[] {
    if (typeof this.tags === 'string') {
      this.tags = this.tags.split(',');
    }

    return this.tags;
  }

  getUrl(): string {
    return this.url
  }
}

export default ArticleMetaInfo;
