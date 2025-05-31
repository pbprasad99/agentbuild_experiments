## Instructions

1. Install [uv](https://github.com/astral-sh/uv) for fast Python dependency management:(if not already installed):
   ```zsh
   pip install uv
   ```
2. Create and activate a virtual environment:
   ```zsh
   uv venv .venv
   source .venv/bin/activate
   ```
3. Install all dependencies:
   ```zsh
   uv pip install -r ../requirements.txt
   ```
4. Run the script
```
source .venv/bin/activate && python3 agent/tenq_agent.py > outputs/output.txt
```






