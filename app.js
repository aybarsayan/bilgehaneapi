const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


dotenv.config();  // Bu satır en üstte olmalı, ardından process.env kullanabilirsiniz.

// OpenAI API anahtarınızı burada da dahil edin
const openai = require('./utils/openai'); // openai.js dosyasından içe aktarın

// Fonksiyonları içe aktar
const {
  getOrCreateAssistant,
  createThread,
  getAssistantResponse,
} = require('./utils/assistant');

const {
  getOrCreateVectorStore,
  updateAssistantWithVectorStore,
  addFilesToVectorStore,
  addFilesFromFolderToVectorStore
} = require('./utils/vectorstore');

// Desteklenen dosya uzantıları
const supportedExtensions = ['.pdf', '.txt', '.docx', '.xlsx'];

// Multer yapılandırması
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (supportedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Desteklenmeyen dosya formatı'))
    }
  }
});



const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'test';

// Sunucu başlatma ve asistan oluşturma
let assistant;

(async () => {
  try {
    // Asistanı al veya oluştur
    assistant = await getOrCreateAssistant();

    // Sunucuyu başlat
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing assistant or vector store:', error);
  }
})();

app.use(cors({
  origin: '*', // Tüm originlere izin ver (güvenlik açısından dikkatli olun)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/analiz', bodyParser.json());
app.use('/subtopics', bodyParser.json());
app.use('/analiz-v2', bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

function apiKeyMiddleware(req, res, next) {
  const apiKey = req.params.apiAnahtari;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ message: 'Geçersiz API anahtarı' });
  }
  next();
}

function validateAndFixSQL(sqlString) {
  // Trim leading and trailing spaces
  sqlString = sqlString.trim();

  // Ensure SQL command starts with 'INSERT'
  const insertIndex = sqlString.indexOf('INSERT');
  if (insertIndex === -1) {
      throw new Error('SQL must start with INSERT.');
  }

  // Remove everything before 'INSERT'
  if (insertIndex > 0) {
      sqlString = sqlString.substring(insertIndex);
  }

  // Function to remove everything after ');'
  function removeAfterClose(sql) {
      const closeIndex = sql.indexOf("');");
      if (closeIndex !== -1) {
          // Remove everything after the closing );
          return sql.substring(0, closeIndex + 3); // include ');'
      }
      return sql;
  }

  // Ensure the SQL command ends with a valid ');'
  sqlString = removeAfterClose(sqlString);

  // If no ');' found, remove last character and try adding the semicolon
  while (!sqlString.trim().endsWith("');")) {
      // Remove last character
      sqlString = sqlString.slice(0, -1).trim();

      // Try adding the ');' to the nearest closing parenthesis
      const lastClosingParenthesis = sqlString.lastIndexOf("')");
      if (lastClosingParenthesis !== -1) {
          sqlString = sqlString.substring(0, lastClosingParenthesis + 2) + ";";
          sqlString = removeAfterClose(sqlString);
          break;
      }
  }

  // If the command still doesn't end with ');', append a semicolon
  if (!sqlString.trim().endsWith(';')) {
    sqlString = sqlString.slice(0, -1) + ";";
  }

  return sqlString;
}

function extractList(inputString) {
  let start = inputString.indexOf('[');
  let end = inputString.lastIndexOf(']');
  
  if (start === -1 || end === -1 || start > end) {
    throw new Error('Geçerli bir liste bulunamadı');
  }
  
  let listString = inputString.slice(start, end + 1);
  
  try {
    return JSON.parse(listString);
  } catch (error) {
    throw new Error('Liste ayrıştırılamadı: ' + error.message);
  }
}


app.post('/analiz/:apiAnahtari', apiKeyMiddleware, async (req, res) => {
  const { category, subcategory, language_id, num_questions, topic, questionid, VECTOR_STORE_ID, language } = req.body;

  // Her zorluk derecesi için soru sayısını belirleme
  const num_easy = Math.floor(num_questions / 3);
  const num_medium = Math.floor(num_questions / 3);
  const num_hard = num_questions - (num_easy + num_medium);

  // Girdi kontrolleri
  if (!category || !subcategory || !language_id || !num_questions || !topic || !VECTOR_STORE_ID || !language) {
      return res.status(400).json({ message: 'Geçersiz istek. Tüm alanlar gereklidir.' });
  }

  try {
    // Kullanıcı mesajını oluştur
    const userMessage = `
    Generate ${num_questions} multiple-choice questions about ${topic} using the information stored in the vector database. 
    Each question should be relevant, well-structured, and designed to test understanding of the key concepts of ${topic}. 
    Questions should cover various aspects of ${topic} such as its features, use cases, and technical details.
      
    Create ${num_easy} easy questions, ${num_medium} medium questions, and ${num_hard} hard questions.
      
    Please format the output as an SQL INSERT statement into the 'tbl_question' table with the following columns:
    - id: start at ${questionid} and increment by one for each question
    - category: ${category}
    - subcategory: ${subcategory}
    - language_id: ${language_id}
    - image: use '' (empty string) for all questions
    - question: The generated question text. Ensure any single quotes in the question text are properly escaped (use '' instead of ').
    - question_type: 1 (all questions should be multiple choice)
    - optiona: Option 1 text
    - optionb: Option 2 text
    - optionc: Option 3 text
    - optiond: Option 4 text
    - optione: '' (optional, use '' if not applicable)
    - answer: 'a' for optiona, 'b' for optionb, 'c' for optionc, or 'd' for optiond
    - level: 1 for easy, 2 for medium, 3 for hard
    - note: Any additional notes relevant to the question
      
    Example format:
    INSERT INTO \`tbl_question\` (\`id\`, \`category\`, \`subcategory\`, \`language_id\`, \`image\`, \`question\`, \`question_type\`, \`optiona\`, \`optionb\`, \`optionc\`, \`optiond\`, \`optione\`, \`answer\`, \`level\`, \`note\`) VALUES
    (433, 2, 4, 14, '', 'How many blockchains has Covalent integrated as of 2023?', 1, '50+', '10+', '100+', '25+', '', 'c', 4, 'Covalent has integrated over 100 blockchains.');
    
    Ensure that:

    - This text should not be placed inside a code block or any markdown text. They will be plain text responses.
    - All questions are multiple choice with 4 options (optiona, optionb, optionc, and optiond).
    - Each row in the SQL statement contains exactly 14 values.
    - Questions will be in ${language} language.
    - If any of the options (optiona, optionb, etc.) are not used, replace them with an empty string '' instead of NULL.
    - There are no additional comments, descriptions, or explanations outside of the SQL code.
    - Ensure to escape quotation marks in the SQL code using two single quotes '' to avoid errors.
    - Ensure under no circumstances that you provide additional comments, descriptions, or explanations outside of the SQL code. Check if your answer meets this criterion.
    `;

    const vectorStore = await getOrCreateVectorStore(VECTOR_STORE_ID);

    // Asistanı vektör deposuyla güncelle
    await updateAssistantWithVectorStore(assistant, vectorStore);
    // İleti dizisi oluştur
    const thread = await createThread(userMessage);
    
    // Asistan yanıtını al
    const analysis = await getAssistantResponse(thread, assistant);
    let trimmedAnalysis = analysis.replace(/\n/g, '');
    trimmedAnalysis = validateAndFixSQL(trimmedAnalysis)
    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log("trimmedAnalysis", trimmedAnalysis);
    
    
    // Bağlantıyı oluştur
    const pool = mysql.createPool({
      host: "ni-corona.guzelhosting.com",      // MySQL sunucunuzun host adı
      user: "bugraay1_bilgehaneadmin",      // MySQL kullanıcı adınız
      password: "1071Aa1071bil15_", // MySQL şifreniz
      database: "bugraay1_bilgehane",  // Bağlanmak istediğiniz veritabanı adı
      waitForConnections: true,
      connectionLimit: 10,  // Maksimum bağlantı sayısı
      queueLimit: 0
    });

    // SQL komutunu çalıştır
    pool.query(trimmedAnalysis, (error, results) => {
      if (error) {
        console.error('SQL çalıştırma hatası:', error.stack);
        return res.status(500).json({ message: 'SQL çalıştırılırken bir hata oluştu.', error: error.message });
      }
      
      // SQL sorgusu başarıyla çalıştırıldıktan sonra sonuçları döndürün
      res.json({ results });

      // Bağlantıyı kapat
      pool.end((err) => {
        if (err) {
          console.error('Bağlantı kapatma hatası:', err.stack);
        } else {
          console.log('MySQL bağlantısı başarıyla kapatıldı.');
        }
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ message: 'API çağrısı sırasında bir hata oluştu.', error: error.message });
  }
});

app.get('/getsqlinfo/:apiAnahtari', apiKeyMiddleware, async (req, res) => {
  try {
    // Bağlantıyı oluştur
    const pool = mysql.createPool({
      host: "ni-corona.guzelhosting.com",      // MySQL sunucunuzun host adı
      user: "bugraay1_bilgehaneadmin",      // MySQL kullanıcı adınız
      password: "1071Aa1071bil15_", // MySQL şifreniz
      database: "bugraay1_bilgehane",  // Bağlanmak istediğiniz veritabanı adı
      waitForConnections: true,
      connectionLimit: 10,  // Maksimum bağlantı sayısı
      queueLimit: 0
    });

    // Kategorileri getir
    const categories = await new Promise((resolve, reject) => {
      pool.query('SELECT id, category_name FROM tbl_category', (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    // Alt kategorileri getir
    const subcategories = await new Promise((resolve, reject) => {
      pool.query('SELECT id, maincat_id, subcategory_name FROM tbl_subcategory', (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    // En büyük soru ID'sini getir
    const maxQuestionId = await new Promise((resolve, reject) => {
      pool.query('SELECT MAX(id) as max_id FROM tbl_question', (error, results) => {
        if (error) return reject(error);
        resolve(results[0].max_id);
      });
    });

    // Sonuçları JSON olarak döndürün
    const response = {
      categories: categories,
      subcategories: subcategories,
      max_question_id: maxQuestionId
    };
    
    res.json(response);

    // Bağlantıyı kapat
    pool.end((err) => {
      if (err) {
        console.error('Bağlantı kapatma hatası:', err.stack);
      } else {
        console.log('MySQL bağlantısı başarıyla kapatıldı.');
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ message: 'API çağrısı sırasında bir hata oluştu.', error: error.message });
  }
});

app.post('/subtopics/:apiAnahtari', apiKeyMiddleware, async (req, res) => {
  const { category, subcategory, language_id, topic, VECTOR_STORE_ID, language } = req.body;

  // Girdi kontrolleri
  if (!category || !subcategory || !language_id || !topic || !VECTOR_STORE_ID || !language) {
    return res.status(400).json({ message: 'Geçersiz istek. Tüm alanlar gereklidir.' });
  }

  try {
    // Kullanıcı mesajını oluştur
    const userMessage = `
    Using the information stored in the vector database, generate a list of 20 subtopics related to ${topic}.
    These subtopics should cover various aspects of ${topic} such as its features, use cases, and technical details.
    The subtopics should be in ${language} language.
    Please format the output as a JavaScript array of strings.
    `;

    const vectorStore = await getOrCreateVectorStore(VECTOR_STORE_ID);

    // Asistanı al (bu fonksiyonun tanımlı olduğunu varsayıyorum)
    const assistant = await getOrCreateAssistant();

    // Asistanı vektör deposuyla güncelle
    await updateAssistantWithVectorStore(assistant, vectorStore);

    // İleti dizisi oluştur
    const thread = await createThread(userMessage);
    
    // Asistan yanıtını al
    const analysis = await getAssistantResponse(thread, assistant);
    console.log("Asistan yanıtı:", analysis);

    let subtopics = extractList(analysis)


    // Yanıtı gönder
    res.json({ subtopics });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ message: 'API çağrısı sırasında bir hata oluştu.', error: error.message });
  }
});

app.post('/analiz-v2/:apiAnahtari', apiKeyMiddleware, async (req, res) => {
  const { category, subcategory, language_id, num_questions, topic, questionid, VECTOR_STORE_ID, language } = req.body;

  // Her zorluk derecesi için soru sayısını belirleme
  const num_easy = Math.floor(num_questions / 3);
  const num_medium = Math.floor(num_questions / 3);
  const num_hard = num_questions - (num_easy + num_medium);

  // Girdi kontrolleri
  if (!category || !subcategory || !language_id || !num_questions || !topic || !VECTOR_STORE_ID || !language) {
      return res.status(400).json({ message: 'Geçersiz istek. Tüm alanlar gereklidir.' });
  }

  try {
    // Kullanıcı mesajını oluştur
    const userMessage = `
    Generate ${num_questions} multiple-choice questions about ${topic} using the information stored in the vector database. 
    Each question should be relevant, well-structured, and designed to test understanding of the key concepts of ${topic}. 
    Questions should cover various aspects of ${topic} such as its features, use cases, and technical details.
      
    Create ${num_easy} easy questions, ${num_medium} medium questions, and ${num_hard} hard questions.
      
    Please format the output as an SQL INSERT statement into the 'tbl_question' table with the following columns:
    - id: start at ${questionid} and increment by one for each question
    - category: ${category}
    - subcategory: ${subcategory}
    - language_id: ${language_id}
    - image: use '' (empty string) for all questions
    - question: The generated question text. Ensure any single quotes in the question text are properly escaped (use '' instead of ').
    - question_type: 1 (all questions should be multiple choice)
    - optiona: Option 1 text
    - optionb: Option 2 text
    - optionc: Option 3 text
    - optiond: Option 4 text
    - optione: '' (optional, use '' if not applicable)
    - answer: 'a' for optiona, 'b' for optionb, 'c' for optionc, or 'd' for optiond
    - level: 1 for easy, 2 for medium, 3 for hard
    - note: Any additional notes relevant to the question
      
    Example format:
    INSERT INTO \`tbl_question\` (\`id\`, \`category\`, \`subcategory\`, \`language_id\`, \`image\`, \`question\`, \`question_type\`, \`optiona\`, \`optionb\`, \`optionc\`, \`optiond\`, \`optione\`, \`answer\`, \`level\`, \`note\`) VALUES
    (433, 2, 4, 14, '', 'How many blockchains has Covalent integrated as of 2023?', 1, '50+', '10+', '100+', '25+', '', 'c', 4, 'Covalent has integrated over 100 blockchains.');
    
    Ensure that:

    - This text should not be placed inside a code block or any markdown text. They will be plain text responses.
    - All questions are multiple choice with 4 options (optiona, optionb, optionc, and optiond).
    - Each row in the SQL statement contains exactly 14 values.
    - Questions will be in ${language} language.
    - If any of the options (optiona, optionb, etc.) are not used, replace them with an empty string '' instead of NULL.
    - There are no additional comments, descriptions, or explanations outside of the SQL code.
    - After creating the quesitons check the answers and make sure they are correct
    - Ensure to escape quotation marks in the SQL code using two single quotes '' to avoid errors.
    - Ensure under no circumstances that you provide additional comments, descriptions, or explanations outside of the SQL code. Check if your answer meets this criterion.
    `;

    const vectorStore = await getOrCreateVectorStore(VECTOR_STORE_ID);

    // Asistanı vektör deposuyla güncelle
    await updateAssistantWithVectorStore(assistant, vectorStore);
    // İleti dizisi oluştur
    const thread = await createThread(userMessage);
    
    // Asistan yanıtını al
    const analysis = await getAssistantResponse(thread, assistant);
    let trimmedAnalysis = analysis.replace(/\n/g, '');
    trimmedAnalysis = validateAndFixSQL(trimmedAnalysis)
    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log("trimmedAnalysis", trimmedAnalysis);
    
    
    // Bağlantıyı oluştur
    res.json({ trimmedAnalysis });
    
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ message: 'API çağrısı sırasında bir hata oluştu.', error: error.message });
  }
});
app.post('/upload-pdfs/:apiAnahtari', apiKeyMiddleware, upload.array('pdfs'), async (req, res) => {
  console.log('Dosya yükleme isteği alındı');
  console.log('Request body:', req.body);
  console.log('Yüklenen dosyalar:', req.files);

  if (!req.files || req.files.length === 0) {
    console.log('Dosya yüklenmedi');
    return res.status(400).json({ message: 'Dosya yüklenmedi' });
  }

  const VECTOR_STORE_ID = req.body.VECTOR_STORE_ID;
  console.log('VECTOR_STORE_ID:', VECTOR_STORE_ID);

  try {
    const vectorStore = await getOrCreateVectorStore(VECTOR_STORE_ID);
    console.log('Vector store oluşturuldu veya alındı:', vectorStore.id);
    
    const uploadFolder = 'uploads/';
    console.log('Dosyalar yükleniyor...');

    await addFilesFromFolderToVectorStore(vectorStore, uploadFolder);
    console.log('Dosyalar vector store\'a eklendi');

    // Yüklenen dosyaları temizle
    req.files.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`Dosya silindi: ${file.path}`);
    });

    console.log('İşlem başarıyla tamamlandı');
    res.json({ 
      message: 'Dosyalar başarıyla yüklendi ve vector store\'a eklendi',
      vectorStoreId: vectorStore.id
    });
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ message: 'Dosya yükleme sırasında bir hata oluştu', error: error.message });
  }
});

app.post('/stream/:apiAnahtari', apiKeyMiddleware, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt gereklidir.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Bir hata oluştu' })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

app.post('/generate-questions/:apiAnahtari', apiKeyMiddleware, async (req, res) => {
  const { category, subcategory, language_id, num_questions, topic, questionid, VECTOR_STORE_ID, language } = req.body;

  // Girdi kontrolleri
  if (!category || !subcategory || !language_id || !num_questions || !topic || !VECTOR_STORE_ID || !language) {
    return res.status(400).json({ message: 'Geçersiz istek. Tüm alanlar gereklidir.' });
  }

  // Her zorluk derecesi için soru sayısını belirleme
  const num_easy = Math.floor(num_questions / 3);
  const num_medium = Math.floor(num_questions / 3);
  const num_hard = num_questions - (num_easy + num_medium);

  const userMessage = `
    Generate ${num_questions} multiple-choice questions about ${topic} using the information stored in the vector database. 
    Each question should be relevant, well-structured, and designed to test understanding of the key concepts of ${topic}. 
    Questions should cover various aspects of ${topic} such as its features, use cases, and technical details.
      
    Create ${num_easy} easy questions, ${num_medium} medium questions, and ${num_hard} hard questions.
      
    Please format the output as an Markdown
    - id: start at ${questionid} and increment by one for each question
    - category: ${category}
    - subcategory: ${subcategory}
    - language_id: ${language_id}
    - image: use '' (empty string) for all questions
    - question: The generated question text. Ensure any single quotes in the question text are properly escaped (use '' instead of ').
    - question_type: 1 (all questions should be multiple choice)
    - optiona: Option 1 text
    - optionb: Option 2 text
    - optionc: Option 3 text
    - optiond: Option 4 text
    - optione: '' (optional, use '' if not applicable)
    - answer: 'a' for optiona, 'b' for optionb, 'c' for optionc, or 'd' for optiond
    - level: 1 for easy, 2 for medium, 3 for hard
    - note: Any additional notes relevant to the question
      

    Ensure that:
    - This text should not be placed inside a code block or any markdown text. They will be plain text responses.
    - All questions are multiple choice with 4 options (optiona, optionb, optionc, and optiond).
    - Questions will be in ${language} language.
    - If any of the options (optiona, optionb, etc.) are not used, replace them with an empty string '' instead of NULL.
    - There are no additional comments, descriptions, or explanations outside of the SQL code.
    - After creating the questions check the answers and make sure they are correct
    - Ensure to escape quotation marks in the markdown format
    - Ensure under no circumstances that you provide additional comments, descriptions, or explanations outside of the SQL code. Check if your answer meets this criterion.
  `;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    });

    let fullResponse = '';
    
    
    for await (const chunk of stream) {
      console.log(chunk.choices[0]?.delta?.content);
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        //const trimmedContent = validateAndFixSQL(fullResponse);
        res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ content: validateAndFixSQL(fullResponse) })}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Bir hata oluştu' })}\n\n`);
  }

  res.end();
});
