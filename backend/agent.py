import anthropic
import json
from config import ANTHROPIC_API_KEY

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


TOOLS = [
    {
        "name": "list_tasks",
        "description": "Get all tasks for the current user. Returns id, title, energy_level, completed, priority_weight, due_date, timer_minutes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "include_completed": {
                    "type": "boolean",
                    "description": "Whether to include completed tasks. Default false."
                }
            },
            "required": []
        }
    },
    {
        "name": "get_inbox",
        "description": "Get all pending notification items (status=inbox). These are GitHub/Slack issues waiting to be accepted or dismissed.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "accept_notification",
        "description": "Accept an inbox notification and turn it into a task. Use this when an item looks important or urgent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_id": {
                    "type": "integer",
                    "description": "The notification item ID to accept"
                }
            },
            "required": ["item_id"]
        }
    },
    {
        "name": "create_task",
        "description": "Create a new task for the user.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title":        {"type": "string", "description": "Task title"},
                "energy_level": {"type": "string", "enum": ["low", "medium", "high"]},
                "due_date":     {"type": "string", "description": "ISO date string, optional"}
            },
            "required": ["title"]
        }
    },
    {
        "name": "update_task",
        "description": "Update a task's energy level or completion status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id":      {"type": "integer"},
                "energy_level": {"type": "string", "enum": ["low", "medium", "high"]},
                "completed":    {"type": "boolean"}
            },
            "required": ["task_id"]
        }
    }
]


def run_agent(user_message: str, tool_executor, system_context: str = ""):
    """
    The agentic loop — keeps running until the AI is done calling tools.
    
    tool_executor: a function that takes (tool_name, tool_input) → result dict
    system_context: extra context like "Today is Monday, user has 5 tasks"
    """
    
    system_prompt = f"""You are Gravitas AI, an intelligent task management assistant.
You help users manage their tasks, review notifications, and plan their work.

Rules:
- Always check current tasks and inbox before giving advice
- Accept high-priority inbox items automatically if user asks you to
- Consider energy levels: suggest low-energy tasks for tired users
- Consider due dates: flag overdue or soon-due tasks
- Be concise but helpful

{system_context}"""

    messages = [{"role": "user", "content": user_message}]

    # ── THE AGENTIC LOOP ──────────────────────────────────────
    # The AI calls tools, gets results, decides what to do next
    # Keeps looping until it gives a final text answer
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            tools=TOOLS,
            messages=messages
        )

        # If the AI wants to use tools, execute them
        if response.stop_reason == "tool_use":
            # Extract all tool calls from the response
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    # Execute the tool against your real database
                    result = tool_executor(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result)
                    })

            # Add the AI's response and tool results to the conversation
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            
            # Loop continues — AI will see the tool results and decide what to do next

        else:
            # AI gave a final text response — we're done
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text
            return final_text