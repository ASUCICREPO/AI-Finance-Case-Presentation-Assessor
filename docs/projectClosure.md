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

