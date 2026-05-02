/**
 * Sample conversations for demo and testing.
 * Each sample is designed to exercise a different usage pattern.
 */

// Strong active learning: curiosity, verification, collaborative, delegation-with-learning
export const SAMPLE_CONVERSATION = `You: Write me a Python script that reads a CSV file and outputs the average of a column.

ChatGPT: Sure! Here's a script that reads a CSV and computes the column average...

You: Now make it handle missing values.

ChatGPT: Great point. Here's the updated version with NaN handling...

You: Why does pandas use NaN instead of None for missing data?

ChatGPT: Good question! Pandas uses NaN because it's a float-compatible sentinel value...

You: What if I wanted to use a database instead of CSV? What are the tradeoffs?

ChatGPT: Great question. Here are the key tradeoffs between CSV and a database...

You: Is this approach correct for large datasets, or would there be performance issues?

ChatGPT: For large datasets, there are a few things to consider...

You: Help me think through whether I should use SQLite or PostgreSQL for this project.

ChatGPT: Let's think through this together. Here are the key factors...

You: Write a function that connects to a SQLite database and runs a query.

ChatGPT: Here's a simple function for that...

You: Does this code handle connection errors properly? Can you review it?

ChatGPT: Looking at the code, here are a few things to improve...`;

// Passive delegation: bare task requests, no learning intent, no follow-up
export const SAMPLE_PASSIVE_CONVERSATION = `You: Write me a cover letter for a software engineer job at Google.

ChatGPT: Here's a cover letter for you...

You: Make it shorter.

ChatGPT: Here's a shorter version...

You: Add a line about my experience with React.

ChatGPT: Done, here's the updated version...

You: Now write a resume summary for the same job.

ChatGPT: Here's a resume summary...

You: Make it more professional.

ChatGPT: Here's a more professional version...`;

// Delegation with learning intent: tasks + explanation requests
export const SAMPLE_DELEGATION_WITH_LEARNING = `You: Fix this function and explain what was wrong so I understand the bug.

ChatGPT: The issue is that you're mutating state directly. Here's the fix and the reasoning...

You: I tried using useEffect to fetch data but it keeps running in an infinite loop. Here's my code — what am I missing?

ChatGPT: The problem is your dependency array. Here's why it loops and how to fix it...

You: Walk me through why React re-renders when state changes. I want to understand the mechanism, not just the rule.

ChatGPT: Great question. Here's what happens under the hood...

You: Generate a custom hook that handles async data fetching with loading and error states, and explain each part.

ChatGPT: Here's the hook with inline comments explaining each decision...

You: What are the limitations of this approach? What edge cases should I watch out for?

ChatGPT: Good thinking. Here are the main edge cases and limitations...`;

// Verification and critique: checking work, asking for edge cases
export const SAMPLE_VERIFICATION_CONVERSATION = `You: I wrote this SQL query to find the top 5 customers by revenue. Is this correct?
SELECT customer_id, SUM(amount) as total FROM orders GROUP BY customer_id ORDER BY total DESC LIMIT 5;

ChatGPT: The query looks mostly correct, but there are a few things to consider...

You: Does this handle NULL values in the amount column properly? Are there any edge cases I'm missing?

ChatGPT: Good catch — NULL values in SUM are silently ignored. Here's how to handle them explicitly...

You: Review this updated version and point out any remaining issues or assumptions.

ChatGPT: The updated query is better. Here are two remaining assumptions worth noting...

You: What could go wrong if this runs on a very large orders table? What are the performance risks?

ChatGPT: For large tables, here are the main performance concerns...

You: Is my understanding correct that adding an index on customer_id would help here?

ChatGPT: Yes, that's correct. Here's why and when it helps...`;

// Copy-paste behavior: long blocks of text, no questions
export const SAMPLE_COPY_PASTE_CONVERSATION = `You: The mitochondria is the powerhouse of the cell. Cells contain many organelles including the nucleus which stores DNA, the endoplasmic reticulum which processes proteins, and the Golgi apparatus which packages and ships proteins to their destinations within or outside the cell. The cell membrane controls what enters and exits the cell.

ChatGPT: Here's a summary of the cell organelles you mentioned...

You: Photosynthesis is the process by which plants use sunlight, water and carbon dioxide to produce oxygen and energy in the form of sugar. This process takes place in the chloroplasts, specifically using the chlorophyll pigment. The light-dependent reactions occur in the thylakoid membranes while the light-independent reactions occur in the stroma.

ChatGPT: Here's a summary of photosynthesis...

You: Write a summary of both topics.

ChatGPT: Here's a combined summary...

You: Make it shorter.

ChatGPT: Here's a shorter version...`;
