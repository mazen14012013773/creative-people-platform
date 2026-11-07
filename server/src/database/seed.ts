import { randomUUID } from 'node:crypto';
import { getClient, query } from '../config/db';

const SKILLS = [
  'تصميم واجهات وتجربة المستخدم',
  'تطوير الويب',
  'تطوير تطبيقات الموبايل',
  'تطوير الواجهات الأمامية',
  'تطوير الخلفية',
  'التصميم الجرافيكي',
  'كتابة المحتوى',
  'الترجمة',
  'التسويق الرقمي',
  'تحسين محركات البحث',
  'إدارة وسائل التواصل',
  'المونتاج والمؤثرات',
  'التصوير الفوتوغرافي',
  'التعليق الصوتي',
  'تحليل البيانات',
  'الذكاء الاصطناعي',
  'إدارة المشاريع',
  'المحاسبة',
  'الاستشارات القانونية',
  'التصميم الداخلي',
  'الهندسة المدنية',
  'الطباعة والتغليف',
];

export const seedDatabase = async (): Promise<void> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const name of SKILLS) {
      await client.query('INSERT INTO skills (id, name) VALUES ($1, $2) ON CONFLICT(name) DO NOTHING', [randomUUID(), name]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const seedArticles = async (): Promise<void> => {
  const articleEditor = (await query("SELECT id FROM users WHERE role = 'Admin' ORDER BY created_at LIMIT 1")).rows[0] as { id: string } | undefined;
  const articles = [
    {
      id: 'article-parenting-first-project', slug: 'support-your-child-first-project',
      title: 'كيف تدعم طفلك في أول مشروع برمجي؟', category: 'نصائح للآباء',
      excerpt: 'خطوات بسيطة تساعد طفلك على تحويل فضوله إلى مشروع ممتع، من دون ضغط أو توقعات أكبر من عمره.',
      cover: '/images/articles/parents.svg', author: 'فريق مبدعين', read: 5,
      content: `ابدأ بالفضول، لا بالشاشة. اسأل طفلك عن الفكرة التي يريد صنعها، ثم ساعده على تقسيمها إلى خطوات صغيرة يمكن تجربتها واحدة بعد الأخرى.\n\n## اجعل التجربة ممتعة\nاختاروا مشروعاً قريباً من اهتمامه: لعبة بسيطة، قصة تفاعلية، أو رسمة تتحرك. لا تحتاج البداية إلى أدوات معقدة؛ المهم أن يرى الطفل نتيجة فكرته بسرعة.\n\n## اسأل بدلاً من أن تنفذ\nعندما يتعثر، جرّب أن تسأله: ماذا تتوقع أن يحدث؟ وما الذي يمكن تغييره؟ بهذه الطريقة يتعلم التفكير وحل المشكلات، ويشعر أن الإنجاز إنجازه.\n\n## احتفل بالمحاولات\nالخطأ جزء طبيعي من التعلم. احتفلوا بكل خطوة صغيرة، وامنحوا المشروع وقتاً يناسب الطفل من دون مقارنة بغيره.`,
    },
    {
      id: 'article-learn-programming-play', slug: 'learn-programming-through-play',
      title: 'تعلم البرمجة باللعب: بداية ممتعة للأطفال', category: 'تعلم البرمجة',
      excerpt: 'من الأوامر الأولى إلى لعبة صغيرة، اكتشف كيف يجعل التعلم بالممارسة البرمجة أقرب وأسهل.',
      cover: '/images/articles/coding.svg', author: 'فريق مبدعين', read: 4,
      content: `البرمجة ليست حفظاً للأوامر؛ إنها طريقة للتعبير عن الأفكار وتجربتها. عندما يبدأ الطفل بلعبة أو قصة يحبها، يصبح كل أمر جديد أداة لصنع شيء يخصه.\n\n## ابدأ بفكرة صغيرة\nيمكن تحريك شخصية، تغيير لون خلفية، أو تشغيل صوت عند الضغط على زر. المشروع الصغير المكتمل يمنح الطفل ثقة أكبر من مشروع ضخم لا ينتهي.\n\n## تعلم بالمحاولة\nشجع طفلك على تغيير قيمة واحدة في كل مرة وملاحظة النتيجة. هذا الأسلوب يربط السبب بالنتيجة ويجعل اكتشاف الأخطاء جزءاً طبيعياً من اللعب.\n\n## شارك ما صنعت\nعرض المشروع على الأسرة أو المجتمع يمنح الطفل فرصة لشرح فكرته والاستماع إلى ملاحظات بناءة.`,
    },
    {
      id: 'article-young-creator-story', slug: 'young-creator-small-steps',
      title: 'قصة مبدع صغير بدأ بفكرة بسيطة', category: 'قصص نجاح',
      excerpt: 'كيف تحولت فكرة صغيرة إلى تجربة ملهمة بفضل الفضول والاستمرار والتعلم خطوة بخطوة.',
      cover: '/images/articles/success.svg', author: 'فريق مبدعين', read: 3,
      content: `بدأت الحكاية بسؤال بسيط: هل أستطيع تصميم لعبة أحكي فيها قصتي؟ لم يكن لدى صاحب الفكرة خبرة كبيرة، لكنه كان مستعداً لتجربة أدوات جديدة وطلب المساعدة عندما يحتاج إليها.\n\n## من الفكرة إلى النموذج\nرسم مكونات اللعبة أولاً، ثم صنع نسخة أولية بسيطة. بعض الأشياء لم تعمل كما تخيلها، فراجع خطواته وعدّلها حتى اقتربت النتيجة من فكرته.\n\n## المشاركة تصنع فرقاً\nعندما عرض المشروع، حصل على ملاحظات ساعدته على تحسينه. الأهم أنه اكتشف أن كل مشروع جديد فرصة للتعلم، وليس اختباراً للكمال.\n\nكل مبدع يبدأ بخطوة، وقد تكون فكرتك القادمة هي البداية.`,
    },
    {
      id: 'article-creative-competitions', slug: 'prepare-for-creative-competitions',
      title: 'كيف يستعد طفلك للمشاركة في مسابقة إبداعية؟', category: 'المسابقات',
      excerpt: 'دليل هادئ لاختيار الفكرة وتجهيز المشروع وعرضه بثقة، مع التركيز على التجربة قبل النتيجة.',
      cover: '/images/articles/competition.svg', author: 'فريق مبدعين', read: 6,
      content: `المسابقة فرصة للتجربة ومشاركة الأفكار، وليست مقياساً لقيمة الطفل أو موهبته. ساعده على اختيار موضوع يحبه، ثم راجعوا شروط المشاركة معاً.\n\n## خططوا بوقت كافٍ\nقسّموا العمل إلى مراحل: اختيار الفكرة، نموذج أولي، تجربة، ثم تجهيز العرض. اتركوا وقتاً للمراجعة والراحة حتى لا يتحول المشروع إلى ضغط.\n\n## تدربوا على الحكاية\nساعد طفلك على شرح المشكلة التي اختارها، وفكرته، وما تعلمه خلال التنفيذ. لا يحتاج إلى كلام محفوظ؛ عرض صادق وواضح يكفي.\n\n## ركزوا على ما تعلمه\nبعد المشاركة، تحدثوا عما سار جيداً وما يريد تجربته لاحقاً. هذه الخطوة تجعل كل نتيجة بداية لتجربة جديدة.`,
    },
  ];
  const sql = `INSERT INTO articles
    (id, title, slug, excerpt, content, cover_image, category, author_name, author_avatar, author_id, published_at, read_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11)
    ON CONFLICT(slug) DO UPDATE SET author_id = COALESCE(articles.author_id, excluded.author_id)`;
  for (const article of articles) await query(sql, [
    article.id, article.title, article.slug, article.excerpt, article.content, article.cover,
    article.category, article.author, articleEditor?.id ?? null, '2026-10-30T09:00:00.000Z', article.read,
  ]);
};
