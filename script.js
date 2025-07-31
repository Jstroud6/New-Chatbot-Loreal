// Wait for the DOM to load before running any code
document.addEventListener("DOMContentLoaded", () => {
  // Get references to the chat form and chat window
  const chatForm = document.getElementById("chatForm");
  const chatWindow = document.getElementById("chatWindow");

  // Create or select an element to display the latest question
  let latestQuestionDiv = document.getElementById("latestQuestion");
  if (!latestQuestionDiv) {
    latestQuestionDiv = document.createElement("div");
    latestQuestionDiv.id = "latestQuestion";
    latestQuestionDiv.style.fontWeight = "bold";
    latestQuestionDiv.style.marginBottom = "8px";
    chatWindow.parentNode.insertBefore(latestQuestionDiv, chatWindow);
  }

  // Store conversation history for multi-turn context
  const conversationHistory = [
    {
      role: "system",
      content: `You are Jay the energetic AI chatbot for L’Oréal Paris. Your sole task is to answer questions about L’Oréal Paris products, routines, and beauty tips. Use short, peppy replies in Markdown:
- Product names in **bold**
- Lists for multi-step routines
- Emojis to add warmth

Begin each conversation with a friendly greeting (e.g. “Hello!  I’m your L’Oréal Paris beauty buddy!”) and end with a light sign-off (e.g. “Happy pampering! 💖”).

If a user asks anything not related to L’Oréal Paris, politely say:
> “Sorry, I can only help with L’Oréal Paris products and routines! 😊”

Always keep responses concise to maintain engagement.`,
    },
  ];

  let userName = null; // Track user's name if provided

  // Listen for form submission (when user sends a message)
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent page reload

    // Get the user's message from the input box
    const userInput = document.getElementById("userInput");
    const userMessage = userInput.value;

    // Try to extract user's name if they introduce themselves
    if (!userName) {
      const nameMatch = userMessage.match(/my name is (\w+)/i);
      if (nameMatch) {
        userName = nameMatch[1];
        // Add a system message to inform the AI of the user's name
        conversationHistory.push({
          role: "system",
          content: `The user's name is ${userName}.`,
        });
      }
    }

    // Add user's message to history
    conversationHistory.push({ role: "user", content: userMessage });

    // Show the user's message in the chat window as a bubble
    appendMessage("user", userMessage);

    // Show the latest question above the chat window
    latestQuestionDiv.textContent = `You asked: ${userMessage}`;

    // Clear the input box for the next message
    userInput.value = "";

    // Send the conversation history and latest user message to OpenAI
    const aiReply = await getOpenAIResponse(conversationHistory, userMessage);

    // Add AI reply to history
    conversationHistory.push({ role: "assistant", content: aiReply });

    // Show the AI's reply in the chat window as a bubble
    appendMessage("ai", aiReply);
  });

  // Function to add a message to the chat window as a bubble
  function appendMessage(sender, text) {
    // Create a div for the message bubble
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg " + sender;

    // Style the bubble differently for user and assistant
    if (sender === "user") {
      msgDiv.style.background = "#e6e6e6";
      msgDiv.style.color = "#222";
      msgDiv.style.alignSelf = "flex-end";
      msgDiv.style.borderRadius = "18px 18px 4px 18px";
      msgDiv.style.padding = "12px 18px";
      msgDiv.style.margin = "8px 0 8px auto";
      msgDiv.style.maxWidth = "70%";
    } else {
      // assistant (ai)
      msgDiv.style.background = "#fff8e1";
      msgDiv.style.color = "#c7a96b";
      msgDiv.style.alignSelf = "flex-start";
      msgDiv.style.borderRadius = "18px 18px 18px 4px";
      msgDiv.style.padding = "12px 18px";
      msgDiv.style.margin = "8px auto 8px 0";
      msgDiv.style.maxWidth = "70%";
      msgDiv.style.border = "1px solid #c7a96b";
    }

    // Set the message text
    msgDiv.textContent = text;

    // Add the bubble to the chat window
    chatWindow.appendChild(msgDiv);

    // Scroll to the bottom so new messages are visible
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// This function sends the conversation history to OpenAI and gets a response
async function getOpenAIResponse(conversationHistory, userMessage) {
  // Cloudflare Worker URL (replace with your actual Worker URL)
  const workerUrl = "https://timetraveler.jstroud6.workers.dev/";

  // Simple check for L'Oréal/beauty-related topics
  const lorealKeywords = [
    "l'oréal",
    "loreal",
    "paris",
    "beauty",
    "makeup",
    "skincare",
    "routine",
    "product",
    "hair",
    "lipstick",
    "mascara",
    "foundation",
    "tips",
    "recommend",
    "cream",
    "serum",
  ];
  const isLorealRelated = lorealKeywords.some((keyword) =>
    userMessage.toLowerCase().includes(keyword)
  );

  if (!isLorealRelated) {
    // If not related, return polite refusal in Jay's style
    return "Sorry, I can only help with L’Oréal Paris products and routines! 😊";
  }

  // Prepare the request options for fetch
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // No Authorization header needed for Worker
    },
    body: JSON.stringify({
      model: "gpt-4o", // Use the gpt-4o model
      messages: conversationHistory,
    }),
  };

  try {
    // Send the request to your Cloudflare Worker
    const response = await fetch(workerUrl, options);
    const data = await response.json();

    // Debug: Show the raw API response in the browser console
    console.log("Cloudflare Worker response:", data);

    // Check if the response contains a valid message
    if (
      data &&
      Array.isArray(data.choices) &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === "string"
    ) {
      // Return the assistant's reply
      return data.choices[0].message.content;
    } else {
      // If the response is not as expected, show an error message
      return "Sorry, I couldn't get a response from Jay. Please try again!";
    }
  } catch (error) {
    // If there's an error, show a message
    console.error("Error connecting to OpenAI:", error);
    return "Sorry, there was a problem connecting to OpenAI.";
  }
}
