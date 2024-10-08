// utils/assistant.js

const OpenAI = require('openai');
require('dotenv').config();

// OpenAI API anahtarınızı burada da dahil edin
const openai = require('./openai'); // openai.js dosyasından içe aktarın

// Mevcut asistan kimliği
const ASSISTANT_ID = 'asst_Ma3hbnEqnFAMwiNbUC8RxClZ'; // Mevcut asistan kimliği

// Asistan oluşturma veya mevcut olanı alma
async function getOrCreateAssistant() {
  if (ASSISTANT_ID) {
    // Mevcut asistanı alın
    try {
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      console.log('Mevcut asistan kullanılıyor:', assistant.id);
      return assistant;
    } catch (error) {
      console.error('Mevcut asistan alınamadı, yeni bir asistan oluşturuluyor...');
    }
  }
  // Yeni bir asistan oluşturun
  const assistant = await openai.beta.assistants.create({
    name: 'Soru Üretim Asistanı',
    instructions: `You are an AI assistant with expertise in generating exam questions based on specific topics. You will create well-structured questions, varying in difficulty levels, that test understanding of the key concepts within the given topic. You are capable of producing questions in both multiple-choice and true/false formats, with each question formatted for insertion into a SQL database. You cannot provide additional information just SQL code for insertion`,
    model: 'gpt-4o-mini',
    tools: [{ type: 'file_search' }],
  });
  console.log('Yeni asistan oluşturuldu:', assistant.id);
  return assistant;
}

// İleti dizisi oluşturma
async function createThread(userMessage) {
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });
  console.log('İleti dizisi oluşturuldu:', thread.id);
  return thread;
}

// Asistan yanıtını alma (Streaming)
function getAssistantResponseStream(threadId, assistantId) {
  const stream = openai.beta.threads.runs.createCompletion({
    thread_id: threadId,
    assistant_id: assistantId,
    stream: true,
  });

  return stream;
}

async function getAssistantResponse(thread, assistant) {
  return new Promise((resolve, reject) => {
    let assistantResponse = '';
    const stream = openai.beta.threads.runs
      .stream(thread.id, {
        assistant_id: assistant.id,
      })
      .on('textCreated', () => console.log('Asistan yanıtlıyor...'))
      .on('messageDone', async (event) => {
        if (event.content[0].type === 'text') {
          const { text } = event.content[0];
          assistantResponse = text.value;
          console.log('Asistanın yanıtı:');
          console.log(assistantResponse);
          resolve(assistantResponse);
        } else {
          resolve('');
        }
      })
      .on('error', (error) => {
        console.error('Hata oluştu:', error);
        reject(error);
      });
  });
}

// Fonksiyonları dışa aktar
module.exports = {
  getOrCreateAssistant,
  createThread,
  getAssistantResponse,
  getAssistantResponseStream,
};