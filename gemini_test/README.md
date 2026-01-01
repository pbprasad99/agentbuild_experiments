# 10-Q Filing Analysis using gemini with langchain.

## Environment Setup with uv

[uv](https://github.com/astral-sh/uv) for fast Python dependency management:

1. Install uv (if not already installed):
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
   uv pip install -r requirements.txt
   ```

4. Run the script
```
python3 tenq_agent.py > output.txt
```

## Thoughts

In an enterprise environment, the following will matter :

1. Data and Data Access: This is public data. The agent will need to access using SEC Edgar API which is also public. We also have a standardized xml based format for this data. The system can be designed to always use this data format.

To provide value, the agent will probably require more supplementary data like recent news, summarized history of previous filings,etc which could be other APIs or curated datasets.

2. Scaling : At scale rate limiting might become be an issue. It would be a good idea to download the files as a separate process and not have the agent access the API directly.

3. Evals : You will need to evaluate the accuracy of your agent and come up with some accuracy metrics to establish confidence.

4. Liability : You will need to provide disclaimer to avoid liability for investment decisions made on the basis of analysis provided by the LLM.

5. ROI : If an Agent can provide a summary report which is equivalent to a human, it could be thousands of man hours for a large organization. Consider it takes a financial analyst spends 8 hours to write a good summarized report and every quarter a company tracks 1000 stocks, that is 8000 hours per report type saved which can be allocated to more productive uses. If we take a human in the loop effort of 1 hour per report for validation and correction, it is still 7000 hours.






