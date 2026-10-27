![ASU AI CIC Logo](./media/project-closure/ASU-AI-CIC-logo.png)

**Project Completion Documentation** 

AI Finance Case Presentation Assessor

![WP Carey School of Business](../WP%20Carey%20PPT%20Assessment.jpg)

![Powered by AWS](./media/project-closure/powered-by-aws.png)

**Authors:** 

**Sreeram Saravana Prasad, Arti Sandeep Javkar**

**Project Closure Date:**

**[TO BE DETERMINED]**

---

**Table of Contents**

**1[. Executive Summary](#1-executive-summary)**

**2[. Project Overview](#2-project-overview)**

2[.1 AWS Leads](#21-aws-leads)

2[.2 ASU Build Team](#22-asu-build-team)

2[.3 Project Timeline](#23-project-timeline)

2[.4 Project Timeline and Sprints](#24-project-timeline-and-sprints)

[**3\. Project Performance**](#3-project-performance)

[3.1 Problem Statement](#31-problem-statement)

[3.2 Project Scope](#32-project-scope)

[3.3 Deliverables](#33-deliverables)

[**4\. Development**](#4-development)

[4.1 UI/UX](#41-uiux)

[4.2 System Architecture](#42-system-architecture)

[4.3 Technology Stack](#43-technology-stack)

[4.4 Key Features Implementation](#44-key-features-implementation)

[4.5 Deployment](#45-deployment)

[**5\. Challenges**](#5-challenges)

[**6\. Future Scope**](#6-future-scope)

[**7\. Appendix**](#7-appendix)

---

### **1\. Executive Summary** {#1-executive-summary}

The W. P. Carey School of Business at Arizona State University required an innovative solution to address a fundamental challenge in finance education: assessing individual student understanding within group-based case analysis projects. Traditional methods could not effectively differentiate individual comprehension when students collaborate on financial analyses.

The AI Finance Case Presentation Assessor is an AI-powered platform that simulates real-world executive presentation environments where each student must independently defend their group's financial analysis to an AI-powered stakeholder persona. The solution leverages cutting-edge AWS services including Amazon Bedrock's Nova 2 Sonic for real-time bidirectional voice interaction and Claude Sonnet 4.5 for intelligent rubric-based assessment.

**Key Capabilities Delivered:**
- Real-time voice-based Q&A sessions with AI stakeholder personas (CEO, CFO, Investors)
- Spreadsheet-aware questioning that references the student's actual Excel workbook
- Structured 6-dimension rubric scoring with configurable weights
- Dual dashboard architecture for students and instructors
- Practice mode for unlimited preparation without grade impact
- Automated assessment reports with evidence citations from transcripts

**Business Impact:**
- Enables scalable individual assessment in group project courses
- Reduces instructor grading burden through AI-assisted evaluation
- Provides students with realistic executive presentation practice
- Maintains academic integrity by testing individual comprehension

---

### **2\. Project Overview** {#2-project-overview}

#### **2.1 AWS Leads** {#21-aws-leads}

[TO BE FILLED - AWS team members and their roles]

#### **2.2 ASU Build Team** {#22-asu-build-team}

- **Sreeram Saravana Prasad** – Full Stack Developer
- **Arti Sandeep Javkar** – Full Stack Developer

#### **2.3 Project Timeline** {#23-project-timeline}

[TO BE DETERMINED]

#### **2.4 Project Timeline and Sprints** {#24-project-timeline-and-sprints}

[TO BE FILLED - Sprint deliverables table]

| Item # | Iterations | Deliverables | Date planned |
| :---- | :---- | :---- | :---- |
| **1** | **Pre POC** | [TO BE FILLED] | **[TBD]** |
| **2** | **Week 1** | [TO BE FILLED] | **[TBD]** |
| **3** | **Week 2** | [TO BE FILLED] | **[TBD]** |
| **4** | **Week 3** | [TO BE FILLED] | **[TBD]** |
| **5** | **Week 4+** | [TO BE FILLED] | **[TBD]** |

---

### **3\. Project Performance** {#3-project-performance}

#### **3.1 Problem Statement** {#31-problem-statement}

In group-based finance and real estate courses at the W. P. Carey School of Business, students collaborate on case analyses involving complex financial models, property valuations, and investment recommendations. While group collaboration develops teamwork skills, it creates a significant challenge: **individual student comprehension is difficult to evaluate**.

**Key Pain Points:**
- Students may contribute unevenly to group work, with some members not fully understanding the analysis
- Traditional written exams don't effectively test a student's ability to defend and explain analytical decisions
- Instructors lack scalable methods to conduct individual oral assessments for large classes
- Existing solutions cannot dynamically question students based on their specific submitted work
- No way to simulate real-world executive presentation scenarios where students must defend their analysis to stakeholders

**Impact:**
- Grade inflation for students who don't fully comprehend the material
- Missed opportunity for authentic executive communication skill development
- Heavy instructor burden if attempting manual individual assessments
- Students unprepared for real-world scenarios where they must independently present financial analyses

#### **3.2 Project Scope** {#32-project-scope}

##### **In Scope**

- Two-dashboard web application (Student and TA/Instructor interfaces)
- Real-time bidirectional voice Q&A with AI personas using Amazon Nova 2 Sonic
- Excel workbook parsing and spreadsheet-aware AI questioning
- Configurable AI stakeholder personas (CEO, CFO, Investor, etc.)
- 6-dimension rubric-based assessment scoring using Claude Sonnet 4.5
- Practice mode for unlimited student preparation
- Graded session mode with submission to gradebook
- Student presentation phase with live transcription
- Instructor persona management (CRUD operations)
- Assessment creation and assignment to student groups
- AI-generated assessment reports with transcript evidence
- Score override capability for instructors
- Access code authentication for student onboarding
- AWS serverless deployment (Amplify, Lambda, DynamoDB, S3, Cognito)

##### **Out of Scope**

- LMS integration (Canvas, Blackboard) – planned for future phase
- Bulk Excel workbook upload for multiple groups – planned for future phase
- Mobile native applications
- Multi-language support
- Video recording storage and playback
- Peer review functionality

#### **3.3 Deliverables** {#33-deliverables}

* Fully functional Next.js web application with dual dashboards
* AWS CDK infrastructure as code (4 CloudFormation stacks)
* Bedrock AgentCore voice agent with custom persona prompts
* 14 AWS Lambda functions for backend operations
* REST API via Amazon API Gateway
* DynamoDB tables for data persistence
* S3 bucket for file storage (workbooks, transcripts, reports)
* Cognito user pool with role-based access (Student/TA/Instructor)
* Comprehensive README and deployment documentation
* Architecture diagrams
* Source code repository with version control

---

### **4\. Development** {#4-development}

#### **4.1 UI/UX** {#41-uiux}

![UI/UX Design Process](./media/project-closure/UI-UX-design-process.png)

#### **Who are the users of this application?**

**Primary Users:**
1. **Students** – Finance and real estate students enrolled in group-based case analysis courses who need to demonstrate individual understanding of their group's work
2. **Teaching Assistants (TAs)** – Graduate assistants responsible for reviewing student submissions and managing assessments
3. **Instructors** – Faculty members who configure assessments, manage personas, set rubric weights, and oversee the grading process

#### **Why are the users using this application?**

**Students use this application to:**
- Practice defending their group's financial analysis in a risk-free environment
- Complete graded assessments that test their individual comprehension
- Experience realistic executive presentation scenarios with AI stakeholders
- Review their uploaded Excel workbooks during Q&A sessions
- Receive immediate AI-generated feedback on their performance

**Instructors/TAs use this application to:**
- Create and configure AI personas that match course stakeholder scenarios
- Assign assessments to student groups with uploaded case materials
- Review AI-generated assessment reports with transcript evidence
- Override AI scores when human judgment is required
- Export grades and analytics for course management

#### **What is the customer opportunity statement?**

Finance instructors at W. P. Carey need a scalable way to assess individual student understanding in group projects. Current methods either don't test individual comprehension or require prohibitive instructor time for one-on-one oral assessments. This platform automates individual assessment through AI-powered stakeholder Q&A sessions, providing authentic executive presentation practice while generating rubric-aligned scores that instructors can review and override.

#### **User Interface**

**Student Dashboard**
![Student Dashboard](./media/project-closure/student-dashboard.png)
> Students access their assigned assessments, view upcoming deadlines, and launch practice or graded Q&A sessions.

**Live Q&A Session**
![Live Q&A Session](./media/project-closure/live-session.png)
> During the live session, students see the AI avatar, Q&A transcript, and can toggle to view their uploaded spreadsheet.

**Instructor Dashboard**
![Instructor Dashboard](./media/project-closure/instructor-dashboard.png)
> Instructors manage personas, create assessments, review submissions, and configure rubric weights.

#### **4.2 System Architecture** {#42-system-architecture}

The platform is built on a fully serverless AWS architecture, designed for scalability, cost-efficiency, and minimal operational overhead.

##### **Architecture Diagram**

![Architecture Diagram](../Architecture.png)

##### **Workflow Description**

1. **Authentication:** Students and TAs authenticate via Amazon Cognito. Role-based access controls route users to appropriate dashboards.

2. **File Upload:** Students upload their group's Excel workbook. The file is stored in S3, and a Lambda function parses it into structured JSON for AI consumption.

3. **Session Initialization:** When starting a Q&A session, the frontend establishes a WebSocket connection to Bedrock AgentCore, passing the persona configuration, workbook context, and presentation transcript.

4. **Live Voice Q&A:** Amazon Nova 2 Sonic handles real-time bidirectional voice streaming. The AI persona asks questions based on the student's actual workbook data. Optional Anam avatar provides visual representation with lip-synced speech.

5. **Assessment Scoring:** At session end, Claude Sonnet 4.5 evaluates the transcript against the 6-dimension rubric, generating scores and evidence citations.

6. **Review & Export:** Instructors review AI assessments, override scores if needed, and export results for gradebook import.

#### **4.3 Technology Stack** {#43-technology-stack}

##### **Frontend**
- **Next.js 16 + React 19**: Modern React framework with App Router for server and client components
- **Tailwind CSS 4**: Utility-first styling with custom ASU maroon theme
- **TypeScript**: Type-safe development across the codebase
- **Hosting**: AWS Amplify with automatic deployments from GitHub

##### **Backend Services**
- **AWS Lambda (Python 3.12)**: 14 serverless functions handling API operations
- **Amazon API Gateway**: REST API with CORS configuration
- **Amazon Cognito**: User authentication with Student/TA/Instructor roles
- **Bedrock AgentCore**: Long-lived WebSocket sessions for voice Q&A

##### **Data Storage**
- **Amazon DynamoDB**: NoSQL tables for personas, sessions, assessments, students, groups, submissions
- **Amazon S3**: Object storage for Excel workbooks, transcripts, reports, and video recordings

##### **AI/ML Services**
- **Amazon Nova 2 Sonic**: Real-time speech-to-speech voice model for bidirectional Q&A
- **Anthropic Claude Sonnet 4.5**: Rubric-based assessment scoring and feedback generation
- **Amazon Nova 2 Lite**: Quick Q&A feedback during sessions
- **Amazon Bedrock Guardrails**: Content safety screening for voice output
- **Amazon Transcribe**: Browser-side streaming transcription for presentation phase

##### **External Services**
- **Anam AI**: 3D avatar visualization with text-to-speech lip-sync

##### **Infrastructure**
- **AWS CDK (TypeScript)**: Infrastructure as Code with 4 stacks
- **Docker**: Container builds for AgentCore runtime
- **Amazon ECR**: Container registry for AgentCore images

#### **4.4 Key Features Implementation** {#44-key-features-implementation}

##### **Feature 1: Real-Time Voice Q&A with AI Personas**

The core feature uses Amazon Bedrock AgentCore to maintain a persistent WebSocket connection for bidirectional voice streaming. The AI persona is configured with a Jinja2 template that incorporates:
- Persona characteristics (name, role, questioning style)
- The student's parsed Excel workbook data
- The presentation transcript from the first phase
- Rubric categories for assessment focus

Amazon Nova 2 Sonic processes student speech in real-time and generates contextually relevant questions that reference specific cells, formulas, and assumptions from their workbook.

##### **Feature 2: Spreadsheet-Aware Questioning**

When students upload their Excel workbook, a Lambda function parses it using openpyxl, extracting:
- Sheet names and structure
- Headers and data rows
- Formulas and cell references
- Numerical values and calculations

This structured data is injected into the AI prompt, enabling questions like "I see your IRR calculation in cell D15 assumes a 5% cap rate. Walk me through why you chose that assumption."

##### **Feature 3: Interactive Spreadsheet Viewer with Formula Highlighting**

Students can toggle between the Q&A transcript and a full-width spreadsheet viewer during their session. The viewer includes Excel-like formula dependency highlighting – when selecting a cell containing a formula, all referenced cells are highlighted with a green border, helping students trace calculations during their explanation.

##### **Feature 4: 6-Dimension Rubric Assessment**

Claude Sonnet 4.5 evaluates transcripts against a standardized rubric:

| Dimension | Weight |
|-----------|--------|
| Problem Diagnosis and Financial Reasoning | 20% |
| Understanding of Calculations and Model Mechanics | 20% |
| Assumption Validation and Analytical Judgment | 20% |
| Analytical Integration and Ownership | 15% |
| Recommendation Defense and Decision Quality | 20% |
| Executive Communication | 5% |

Each dimension is scored across 4 performance levels: Strong, Competent, Partial, Insufficient.

##### **Feature 5: Anam Avatar Integration**

For graded sessions, an optional 3D avatar powered by Anam AI provides visual representation of the stakeholder persona. The implementation includes sentence-buffered text-to-speech – text is accumulated until sentence boundaries (. ! ?) before being sent to the avatar, preventing choppy mid-sentence speech.

##### **Feature 6: Practice vs. Graded Modes**

Students can take unlimited practice sessions that don't affect their grade, allowing them to prepare before the graded assessment. Practice sessions use voice-only mode (no avatar) to reduce API costs while maintaining the same Q&A experience.

#### **4.5 Deployment** {#45-deployment}

##### **Prerequisites**
- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- Docker (for AgentCore container builds)
- Python 3.12 (for Lambda development)
- Amazon Bedrock model access enabled (Nova 2 Sonic, Claude Sonnet 4.5, Nova 2 Lite)

##### **Deployment Steps**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ASUCICREPO/AI-Finance-Case-Presentation-Assessor.git
   cd AI-Finance-Case-Presentation-Assessor
   ```

2. **Deploy backend infrastructure:**
   ```bash
   cd backend
   npm install
   npx cdk bootstrap  # First time only
   npx cdk deploy --all -c branchName=main
   ```

3. **Configure frontend environment:**
   Create `frontend/.env.local` with CDK stack outputs:
   ```
   NEXT_PUBLIC_API_URL=<ApiUrl output>
   NEXT_PUBLIC_USER_POOL_ID=<UserPoolId output>
   NEXT_PUBLIC_USER_POOL_CLIENT_ID=<UserPoolClientId output>
   NEXT_PUBLIC_IDENTITY_POOL_ID=<IdentityPoolId output>
   NEXT_PUBLIC_AGENTCORE_WS_URL=<AgentCoreWebSocketUrl output>
   NEXT_PUBLIC_AWS_REGION=us-east-1
   ```

4. **Frontend auto-deploys via Amplify** when changes are pushed to the main branch.

