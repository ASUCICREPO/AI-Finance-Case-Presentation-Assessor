# AI Finance Case Presentation Assessor

An AI-powered platform that assesses individual student understanding of group financial case analyses through persona-based stakeholder Q&A sessions. Built for the W. P. Carey School of Business at Arizona State University.

---

## Overview

In group-based finance and real estate courses, students collaborate on case analyses but individual comprehension can be difficult to evaluate. This platform addresses that challenge by simulating a real-world executive presentation environment where each student must independently defend their group's analysis to an AI-powered stakeholder persona.

### How It Works

1. **Group Submission** — Student groups submit their financial case analysis (spreadsheet model + executive summary + presentation slides)
2. **Individual Presentation** — Each student records a presentation defending the group's analysis and recommendations
3. **AI Stakeholder Q&A** — An AI persona (e.g., a CEO, CFO, or board member relevant to the case) conducts a live voice Q&A session, asking targeted questions based on the group's actual submitted workbook
4. **Assessment Report** — The system generates a structured rubric-based evaluation report for the instructor, citing transcript evidence and workbook references

---

## Key Features

- **Persona-based questioning** — AI assumes a realistic stakeholder role relevant to the case scenario
- **Spreadsheet-aware assessment** — Questions are dynamically generated based on the group's actual financial model, assumptions, and calculations
- **Structured rubric scoring** — Evaluates financial reasoning, model understanding, assumption validation, analytical ownership, recommendation defense, and communication
- **Voice-based interaction** — Real-time bidirectional voice Q&A powered by Amazon Nova Sonic
- **Instructor controls** — Configurable personas, question banks, rubric weights, and evaluation criteria
- **Automated reporting** — PDF/JSON assessment reports with confidence levels and evidence citations

---

## Architecture

Built on a serverless AWS architecture:

- **Frontend** — Next.js hosted on AWS Amplify
- **Authentication** — Amazon Cognito
- **Voice Q&A** — Amazon Bedrock AgentCore with Nova Sonic (bidirectional speech)
- **Spreadsheet Processing** — Lambda-based workbook parsing and pre-analysis
- **Assessment Engine** — Amazon Bedrock (Nova Pro / Claude) for rubric scoring
- **Storage** — Amazon S3 (uploads, transcripts, reports), DynamoDB (personas, cases)
- **Content Safety** — Bedrock Guardrails

---

## Project Status

🚧 **In Development** — Targeting Fall 2026 pilot deployment.

---

## Deployment

Deployment instructions will be added as the project progresses.

---

## Credits

Developed by the ASU AI Cloud Innovation Center powered by AWS.

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Disclaimers

This application is a proof-of-concept developed for educational assessment purposes. It is not intended to replace faculty grading authority or serve as an automated academic misconduct determination system. AI-generated assessments are provisional and subject to instructor review and override.
