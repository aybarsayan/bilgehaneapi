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