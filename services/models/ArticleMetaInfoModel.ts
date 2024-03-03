interface ArticleMetaInfoModel {
  id: number;

  title: string;

  author: string;

  subtitle?: string;

  date: string;

  tags: string | string[];
}

export default ArticleMetaInfoModel;
