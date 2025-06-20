import os
from openai import OpenAI
import json
from typing import Dict, Any

class OpenAIService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def analyze_pdf_content(self, raw_text: str, extraction_type: str) -> Dict[str, Any]:
        """Use ChatGPT to intelligently analyze and structure PDF content"""
        
        prompts = {
            "general": self._get_general_prompt(),
            "invoice": self._get_invoice_prompt(),
            "contract": self._get_contract_prompt()
        }
        
        prompt = prompts.get(extraction_type, prompts["general"])
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Please analyze this document:\n\n{raw_text}"}
                ],
                max_tokens=2000,
                temperature=0.1
            )
            
            content = response.choices[0].message.content or ""
            
            # Try to parse as JSON, fallback to structured response
            try:
                structured_data = json.loads(content)
            except json.JSONDecodeError:
                structured_data = {"analysis": content}
            
            return structured_data
            
        except Exception as e:
            return {"error": f"OpenAI API error: {str(e)}"}
    
    async def generate_summary(self, raw_text: str, extraction_type: str) -> str:
        """Generate an intelligent summary of the document"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert document analyst. Provide a clear, concise summary of the document highlighting the most important information."
                    },
                    {
                        "role": "user", 
                        "content": f"Summarize this {extraction_type} document:\n\n{raw_text[:4000]}"
                    }
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            return response.choices[0].message.content or "Summary not available"
            
        except Exception as e:
            return f"Could not generate summary: {str(e)}"
    
    async def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        """Extract key entities like dates, amounts, emails, etc."""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": """Extract key entities from the document and return as JSON:
                        {
                            "dates": ["list of dates"],
                            "amounts": ["list of monetary amounts"],
                            "emails": ["list of email addresses"],
                            "phone_numbers": ["list of phone numbers"],
                            "names": ["list of person/company names"],
                            "addresses": ["list of addresses"]
                        }"""
                    },
                    {"role": "user", "content": raw_text[:3000]}
                ],
                max_tokens=800,
                temperature=0.1
            )
            
            content = response.choices[0].message.content or "{}"
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"entities": content}
                
        except Exception as e:
            return {"error": f"Entity extraction failed: {str(e)}"}
    
    def _get_general_prompt(self) -> str:
        return """You are an expert document analyst. Analyze the document and extract key information in JSON format:
        {
            "document_type": "type of document",
            "key_topics": ["list of main topics"],
            "important_dates": ["list of important dates"],
            "key_figures": ["important numbers/amounts"],
            "entities": {
                "people": ["names mentioned"],
                "organizations": ["companies/orgs mentioned"],
                "locations": ["places mentioned"]
            },
            "action_items": ["any tasks or actions mentioned"],
            "confidence_score": "1-10 rating of extraction confidence"
        }"""
    
    def _get_invoice_prompt(self) -> str:
        return """You are an expert invoice processor. Extract invoice information in JSON format:
        {
            "invoice_number": "invoice number",
            "invoice_date": "date issued",
            "due_date": "payment due date",
            "vendor": {
                "name": "vendor name",
                "address": "vendor address",
                "contact": "contact info"
            },
            "customer": {
                "name": "customer name", 
                "address": "customer address"
            },
            "line_items": [
                {
                    "description": "item description",
                    "quantity": "quantity",
                    "rate": "unit price",
                    "amount": "total amount"
                }
            ],
            "subtotal": "subtotal amount",
            "tax": "tax amount",
            "total": "total amount",
            "payment_terms": "payment terms",
            "confidence_score": "1-10 rating"
        }"""
    
    def _get_contract_prompt(self) -> str:
        return """You are an expert contract analyst. Extract contract information in JSON format:
        {
            "contract_type": "type of contract",
            "parties": {
                "party_a": "first party name and details",
                "party_b": "second party name and details"
            },
            "effective_date": "when contract starts",
            "expiration_date": "when contract ends",
            "contract_value": "total contract value",
            "key_terms": [
                "list of important terms and conditions"
            ],
            "obligations": {
                "party_a_obligations": ["what party A must do"],
                "party_b_obligations": ["what party B must do"]
            },
            "termination_clauses": ["termination conditions"],
            "governing_law": "applicable jurisdiction",
            "renewal_terms": "renewal conditions if any",
            "confidentiality": "confidentiality requirements",
            "confidence_score": "1-10 rating"
        }""" 