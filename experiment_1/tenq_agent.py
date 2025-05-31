"""
10-Q Filing Analysis using gemini with langchain.
"""
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
# import xmltodict

#load env variable for API keys
from dotenv import load_dotenv
import os
load_dotenv()  # reads .env into os.environ
# Load Gemini API key from environment (should be set in .env)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not set. Please add it to your .env file.")

# Parse XBRL and extract key metrics
def get_xbrl_data(xbrl_path):
    with open(xbrl_path, 'r') as f:
        # xbrl_dict = xmltodict.parse(f.read())
        xbrl_raw = f.read()
    return xbrl_raw

if __name__ == "__main__":
    #remove hardcoding
    xbrl_file = "hims-20250331_htm.xml"
    ticker = "HIMS"
    xbrl_data = get_xbrl_data(xbrl_file)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a financial analyst specialized in fundamental analysis. Given a 10-Q XBRL filing, you are able to perform fundamental anaalysis and extract key financial metrics."),
        ("human", f"10-Q filing for {{ticker}}: {{xbrl_data}}\ Summarize the results in a clear, human-readable text format and provide any possible actionable insights in 500 to 1000 words. Do not use bold or italics, and do not use any markdown formatting. Do not include any disclaimers or warnings. Focus on the key financial metrics and insights that an investor would care about. The response should be concise and to the point."),
    ])
    llm = ChatGoogleGenerativeAI(temperature=0,model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY)
    chain = prompt | llm
    response = chain.invoke({"xbrl_data": xbrl_data,
                            "ticker": ticker})
    # print("Response from LLM:") 
    print(response.content)
