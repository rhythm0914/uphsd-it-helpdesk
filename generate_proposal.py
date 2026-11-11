# -*- coding: utf-8 -*-
"""Regenerate the UPHSD IT Help Desk Title Proposal (Improved 12 sections)."""
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# --- base style tweaks ---
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)

def h1(text):
    return doc.add_paragraph(text, style='Heading 1')

def h2(text):
    return doc.add_paragraph(text, style='Heading 2')

def h3(text):
    return doc.add_paragraph(text, style='Heading 3')

def p(text, bold=False):
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.bold = bold
    return para

def bullet(text):
    return doc.add_paragraph(text, style='List Bullet')

# =========================================================================
# 1. PROJECT TITLE
# =========================================================================
h1('1. Project Title')
p('Recommended Title:')
p('Development of a Web-Based IT Help Desk and Service Request Management System with AI-Powered Assistant for Students and Employees of the University of Perpetual Help System DALTA (UPHSD)')
p('Or:')
bullet('Developing a Web-Based IT Service Request and Support Ticketing System with an AI Chatbot for Students and Employees of UPHSD')
bullet('Development of a Web-Based IT Help Desk System with Intelligent Chatbot Support for UPHSD')
bullet('Developing an Online IT Concern Tracking and Evaluation System for the IT Department of UPHSD')
p('')
p('A web-based IT Help Desk System that provides UPHSD students and employees with a centralized, role-based platform to submit, track, and evaluate IT service requests. The system enables the IT Department to organize, prioritize, assign, and resolve requests while providing real-time status updates, in-app notifications, an audit trail of status history, duplicate-request detection, and an AI-powered chatbot for general IT assistance and basic troubleshooting guidance.')
# =========================================================================
# 2. BACKGROUND OF THE PROJECT
# =========================================================================
h1('2. Background of the Project')
p('Information technology now underpins nearly every academic and administrative activity in a modern university. Students and employees of UPHSD depend on institutional email, learning management systems, network and Wi-Fi connectivity, office and academic software, university accounts, and computer hardware to study, teach, and perform their day-to-day responsibilities. As the use of these technologies grows, so does the demand for a dependable, well-organized IT support service that can respond quickly and keep full records of every concern.')
p('In many academic institutions, including UPHSD, IT concerns are still raised informally and handled manually \u2014 through walk-in visits, email threads, phone calls, and paper-based forms. This approach makes it difficult for the IT Department to organize requests, set priorities, assign work, and follow up consistently. Requesters often have no clear way of knowing the current status of their request or when it will be addressed. Manual handling also leads to duplicate submissions, lost or scattered records, the absence of an audit trail, and difficulty in measuring the quality and timeliness of service. These are precisely the problems that IT Service Management (ITSM) frameworks, such as ITIL, aim to solve through a centralized service desk and a formal ticket lifecycle.')
p('The proposed Web-Based IT Help Desk System addresses this gap by providing a single centralized platform where students and employees can formally submit, monitor, and evaluate their IT requests, and where the IT Department can view, categorize, prioritize, assign, and resolve those requests in an organized workflow. Each request is issued a unique ticket number, assigned a service category and priority, and tracked through a clear status lifecycle (Open, In Progress, Waiting for User, Resolved, and Closed) with a full history of every change.')
p('Beyond formal ticketing, the system includes an AI-powered chatbot backed by a curated institutional knowledge base. The assistant provides on-demand answers to common questions and basic troubleshooting guidance, reducing the number of trivial tickets and freeing IT personnel for more complex work \u2014 a recognized benefit of self-service and AI-assisted support in education. When an issue requires direct action by the IT Department, the chatbot guides the user to submit an official request through the system.')
p('Once a concern is resolved, the requester is asked to confirm the resolution and to rate the quality of the service received. This feedback loop gives the IT Department measurable insight into service performance and provides an auditable record of each completed request. Overall, the project aims to establish a more efficient, transparent, and accountable process for handling IT support \u2014 improving communication between the UPHSD community and its IT Department while reducing manual effort, duplicate entries, and the difficulty of tracking service requests.')

# =========================================================================
# 3. PROBLEM STATEMENT
# =========================================================================
h1('3. Problem Statement')
p('The project aims to address the following problems:')
bullet('How can students and employees conveniently submit and provide the necessary details for their IT service requests?')
bullet('How can requesters easily monitor the current status and progress of their IT concerns?')
bullet('How can the IT Department efficiently organize, prioritize, assign, and manage incoming IT service requests?')
bullet('How can requesters receive timely updates regarding the progress and resolution of their submitted requests?')
bullet('How can users receive immediate assistance for common IT concerns without having to submit a formal service request for every basic question?')
bullet('How can the system help prevent duplicate requests and reduce the manual processes involved in managing IT concerns?')
bullet('How can requesters confirm the completion of their concerns and provide feedback about the quality of the IT service they received?')
# =========================================================================
# 4. PROJECT OBJECTIVES
# =========================================================================
h1('4. Project Objectives')
h2('General Objective')
p('To develop a web-based IT Help Desk System that provides an organized and efficient platform for managing the school\u2019s IT support services. The system allows UPHSD students and employees to submit and track the progress of their requests in real time, and allows the IT Department to review, categorize, prioritize, assign, and resolve each concern. Once a request is completed, the requester is able to confirm the resolution and evaluate the IT service received. The system also includes an AI-powered chatbot that provides general IT assistance and basic troubleshooting guidance and encourages users to submit an official IT request when direct assistance from the IT Department is required. Through these features, the proposed system aims to improve the efficiency and quality of IT support while reducing manual processes, duplicate entries, and difficulties in tracking service requests.')
h2('Specific Objectives')
p('The project aims to:')
bullet('Develop a web-based IT Help Desk System that allows students and employees to create accounts using their institutional email and to submit IT service requests through an organized, accessible platform.')
bullet('Support structured service handling by classifying each request under a service type and a related category and assigning it a unique, automatically generated ticket number (IT-YYYY-NNNNNN) and a priority level.')
bullet('Provide real-time request tracking that allows requesters to monitor the status and progress of their submitted IT concerns through a recorded status lifecycle and a full history of changes.')
bullet('Enable the IT Department to manage service requests by reviewing, categorizing, prioritizing, assigning, and resolving IT concerns efficiently through a staff queue and ticket management interface.')
bullet('Provide request status updates and in-app notifications to keep requesters informed throughout the processing and resolution of their concerns, including requests for additional information.')
bullet('Detect and prevent duplicate requests and maintain organized, centralized IT service records to reduce manual processes and provide an auditable trail for the IT Department.')
bullet('Implement an AI-powered chatbot that provides general IT assistance and basic troubleshooting guidance and encourages users to submit an official IT request when direct assistance is required.')
bullet('Provide a request confirmation and evaluation feature that allows requesters to confirm the resolution of completed concerns and rate the quality of the IT service provided.')
bullet('Provide administrative and reporting tools, including user management, service and category management, CSV import and export, archiving, and ICT asset tracking, to support the daily operations of the IT Department.')

# =========================================================================
# 5. TARGET USERS
# =========================================================================
h1('5. Target Users')
p('The system serves the UPHSD community and the IT Department. The primary end-users who submit and track IT concerns are UPHSD students and employees (faculty and staff). The IT Department is the primary system user responsible for managing and resolving requests, while an IT supervisor and an administrator oversee operations and system administration.')
h3('Summary of User Roles')
bullet('Students and Employees \u2192 Register, sign in, submit and monitor their IT concerns, reply to requests for information, and evaluate completed services.')
bullet('IT Staff \u2192 View the request queue, filter and search tickets, assign work, update status and priority, add work remarks, send messages, and resolve submitted concerns.')
bullet('IT Supervisor (Manager) \u2192 Oversee IT support operations, monitor IT staff activity, analyze reports, and coordinate the resolution of high-priority concerns.')
bullet('Administrator \u2192 Manage the system, users, services and categories, reports, imports and exports, archived records, ICT assets, and the knowledge base.')

p('Table 1 below summarizes the user roles and their responsibilities in the system.', bold=True)

roles = [
    ('User Role', 'Responsibilities'),
    ('Administrator', 'Manages the overall system: user accounts and role assignment, services and categories and their mappings, reports, import/export, archived tickets, ICT asset inventory, and the AI knowledge base.'),
    ('IT Supervisor (Manager)', 'Monitors IT support operations, reviews IT staff activity and performance, analyzes support reports and statistics, and coordinates high-priority or unresolved concerns.'),
    ('IT Staff', 'Views the request queue, assigns and updates tickets, sets priority, changes status with notes, adds work remarks and messages, and resolves IT service requests.'),
    ('Student', 'Registers with an institutional email, submits IT service requests, tracks request status and history, receives notifications, and confirms and rates completed services.'),
    ('Employee (Faculty / Staff)', 'Submits IT concerns, tracks request status and history, receives notifications, replies to requests for information, and evaluates completed services.'),
]
t1 = doc.add_table(rows=len(roles), cols=2)
t1.style = 'Table Grid'
for i, (a, b) in enumerate(roles):
    t1.rows[i].cells[0].text = a
    t1.rows[i].cells[1].text = b

p('')
# =========================================================================
# 6. DEFINE THE SCOPE
# =========================================================================
h1('6. Define the Scope')
p('The scope clearly identifies what the system will and will not do in its initial release. This keeps the project focused and prevents it from becoming too large.')
h2('Included in the Scope')
bullet('User registration, login, logout, and password recovery, with role-based access and institutional email validation.')
bullet('IT service request submission with dynamic service and category selection, subject, description, and priority.')
bullet('Automatic generation of a unique ticket number (IT-YYYY-NNNNNN) for every request.')
bullet('Request tracking and monitoring through a recorded status lifecycle (Open, In Progress, Waiting for User, Resolved, Closed) with a full status history.')
bullet('IT staff queue with filtering, searching, assignment, prioritization, status updates, work remarks, and internal notes.')
bullet('Requester replies for requests-for-information, and automatic return of the ticket to In Progress.')
bullet('Request confirmation and rating/evaluation of completed services.')
bullet('In-app notifications for status changes and updates.')
bullet('An AI-powered chatbot that answers common questions from a curated, published knowledge base and guides users to official ticket submission.')
bullet('Administrative tools: user management, service and category management and mapping, reports, CSV/JSON export, CSV import with validation and duplicate detection, and ticket archiving.')
bullet('ICT asset inventory management, including asset records and movement history.')
h2('Not Included in the Scope (Initial Release)')
bullet('Online payment or billing functionality.')
bullet('Integration with external government or third-party systems.')
bullet('Native mobile applications (the system is web-based and mobile-responsive rather than a standalone mobile app).')
bullet('Automated decision-making \u2014 the AI chatbot assists and guides users but does not autonomously resolve or close tickets without IT action.')
bullet('SMS and email gateway notifications (notifications are in-app in the initial release).')
bullet('Physical hardware repair or on-site work itself \u2014 the system only tracks and manages such requests; the actual repair is performed offline by IT personnel.')
# =========================================================================
# 7. GATHER SOFTWARE REQUIREMENTS
# =========================================================================
h1('7. Gather Software Requirements')
p('This section defines the functional and non-functional requirements of the system. These requirements are directly derived from the features implemented in the project.')
h2('Functional Requirements')
p('These describe what the system should do.')
bullet('The system shall allow students and employees to register using a valid institutional email address (@perpetual.edu.ph) and to sign in securely.')
bullet('The system shall allow authenticated users to submit an IT service request by selecting a service, a related category, and a priority, and by providing a subject and description.')
bullet('The system shall automatically generate a unique ticket number (IT-YYYY-NNNNNN) for each submitted request.')
bullet('The system shall allow requesters to view the current status and complete history of their submitted requests.')
bullet('The system shall allow IT staff to view the request queue and to filter and search tickets.')
bullet('The system shall allow IT staff to assign a ticket to a staff member, which shall transition the ticket status to In Progress.')
bullet('The system shall allow IT staff to update ticket status (Open, In Progress, Waiting for User, Resolved, Closed) with notes and record the change in the status history.')
bullet('The system shall allow IT staff to set or change the priority of a ticket (Low, Normal, High, Urgent).')
bullet('The system shall allow IT staff to add internal work remarks and to send messages, and to request additional information from the requester.')
bullet('The system shall allow a requester to reply to a request for information and automatically return the ticket to In Progress.')
bullet('The system shall notify requesters when the status of their ticket changes.')
bullet('The system shall allow requesters to confirm the resolution of a resolved ticket and to rate the quality of the service received.')
bullet('The system shall detect potential duplicate requests and warn or reject them during submission and during CSV import.')
bullet('The system shall provide reports and support CSV and JSON export of ticket data and CSV import with validation.')
bullet('The system shall allow administrators to manage users, services, ticket categories, and their relationships.')
bullet('The system shall allow an AI-powered chatbot to answer common questions by retrieving from a published knowledge base and to guide users to submit an official ticket when needed.')
bullet('The system shall allow managers and administrators to archive tickets and to manage the ICT asset inventory and its movement history.')
h2('Non-Functional Requirements')
p('These describe how the system should perform.')
bullet('Security \u2014 the system shall enforce role-based access control and Row-Level Security, perform server-side authorization, enforce a password policy, and never expose secrets such as the service-role key to the client.')
bullet('Usability \u2014 the system shall provide a responsive, mobile-friendly web interface consistent with the UPHSD institutional branding and accessible on phones, tablets, and desktops.')
bullet('Reliability \u2014 the system shall be available during the declared business hours (Monday to Friday, 8:00 AM \u2013 5:00 PM) with minimal downtime.')
bullet('Performance \u2014 authenticated pages shall be rendered dynamically to prevent stale caching, and responses shall remain timely under expected institutional usage.')
bullet('Maintainability \u2014 the codebase shall be modular, strictly typed, documented, and covered by automated unit tests so it can be extended reliably.')
bullet('Availability and Scalability \u2014 the system shall be deployed on a cloud edge platform that scales to handle fluctuating use during the academic year.')
bullet('Data Integrity \u2014 the system shall maintain audit trails (status history, import logs, asset movement history) and preserve records through archiving rather than destructive deletion.')
bullet('Privacy and Transparency \u2014 the AI assistant shall only use published knowledge-base content, apply per-user rate limiting, and never expose raw errors or other users\u2019 data.')
# =========================================================================
# 8. CHOOSE A SOFTWARE DEVELOPMENT METHODOLOGY
# =========================================================================
h1('8. Choose a Software Development Methodology')
p('The project follows an Agile (Scrum-based) software development methodology. Development is organized into iterative sprints that move through the following cycle:')
p('Requirements \u2192 Planning \u2192 Design \u2192 Development \u2192 Testing \u2192 Review \u2192 Improvement', bold=True)
h3('Why Agile is Appropriate for this Project')
bullet('Requirements can evolve. The IT concepts, report formats, and features were refined throughout the project, and Agile accommodates changing and emerging requirements.')
bullet('Continuous user feedback. End users (students, employees, IT staff) can review each increment, allowing the team to adjust priorities and fix usability issues early.')
bullet('Early and frequent delivery. The system is delivered in phases \u2014 landing page, authentication and database, request submission and tracking, IT staff queue, admin modules, and the AI assistant \u2014 each providing working, testable functionality.')
bullet('Separate testing in each iteration. Each phase undergoes its own testing, which integrates naturally with the Agile cycle and supports the software testing plan.')
bullet('Risk reduction. By delivering small increments, the team continuously validates assumptions and avoids the high risk of delivering a large, monolithic system at the end.')
p('Alternative methodologies considered include Waterfall, Spiral, Prototyping, and DevOps. A pure Waterfall approach was considered less suitable because it assumes that requirements are fully known and stable at the start, which is not the case for a system with evolving ticketing, reporting, and AI-assisted features.')
# =========================================================================
# 9. CREATE THE SOFTWARE ENGINEERING MODELS
# =========================================================================
h1('9. Create the Software Engineering Models')
p('The proposal is supported by the following software engineering models and diagrams, which demonstrate how software engineering concepts are applied to the system.')
h3('Use Case Diagram')
p('Shows the interaction between users and the system. The actors are Student, Employee, IT Staff, IT Supervisor (Manager), and Administrator. Representative use cases include Register and Sign In, Submit IT Request, Track Request, Manage Request Queue, Assign and Update Ticket, Request Information, Confirm Resolution and Rate Service, Manage Users, Manage Services and Categories, Generate Reports, Import and Export Data, Manage ICT Assets, and Chat with the AI Assistant.')
h3('Activity Diagram')
p('Shows the workflow and process of a ticket through its lifecycle: Requester submits a request \u2192 System validates the service/category and generates a ticket number \u2192 IT staff review and assign the ticket \u2192 status moves to In Progress \u2192 staff update status and send updates (or request further information, moving the ticket to Waiting for User) \u2192 requester confirms resolution \u2192 requester rates the service \u2192 ticket is Closed.')
h3('Class Diagram')
p('Shows the system classes, attributes, methods, and their relationships. The main entities are Profile (User), Service, TicketCategory, ServiceCategory, Ticket, TicketStatusHistory, TicketMessage, Import, KnowledgeArticle, and ICT Asset, with their attributes and the relationships among them defined by the database schema.')
h3('Sequence Diagram')
p('Shows the interaction between users and system components over time. Two key flows are modeled: (1) the request submission flow from the requester through the web interface and application logic to the database, and (2) the status-update and notification flow when IT staff change a ticket\u2019s status and the requester is notified and reviews the updated history.')
h3('System Architecture')
p('Shows the layered architecture of the system and how the components interact, as illustrated in the next section.')
p('User \u2192 Presentation Layer (Web Interface) \u2192 Application / API Layer \u2192 Data Access Layer with Row-Level Security \u2192 Database', bold=True)
p('The AI assistant sits alongside the application layer and is served by the cloud AI provider, retrieving from the published knowledge base. These diagrams demonstrate that software engineering principles are applied throughout the design of the system.')
# =========================================================================
# 10. PROPOSED SYSTEM ARCHITECTURE
# =========================================================================
h1('10. Proposed System Architecture')
p('The system follows a layered, client-server architecture deployed on a cloud edge platform. Each layer is separated so that the interface, business logic, and data storage can evolve independently.', bold=True)
p('USERS  (Students | Employees | IT Staff | IT Supervisor | Administrator)')
p('\u2502')
p('\u2502')
p('\u25bc')
p('PRESENTATION LAYER  \u2500  Web interface (React / Next.js) \u2014 dashboards, request form, ticket views, admin modules, AI assistant UI')
p('\u2502')
p('\u25bc')
p('APPLICATION / API LAYER  \u2500  Next.js Server Actions, Route Handlers and REST API (business logic, validation, authorization)')
p('\u2502')
p('\u25bc')
p('DATA ACCESS LAYER  \u2500  Supabase client with Row-Level Security and server-side authorization checks')
p('\u2502')
p('\u25bc')
p('DATA & EXTERNAL SERVICES  \u2500  PostgreSQL database (profiles, tickets, history, categories, imports, assets, knowledge base) + Cloudflare Workers AI (assistant)')
p('')
p('Why this architecture was selected: the layered approach separates concerns, making the system easier to test, maintain, and extend; the cloud edge deployment provides scalability and high availability; Row-Level Security enforces data isolation at the database level; and the integration of a cloud AI service adds intelligent assistance without complicating the core business logic.')
# =========================================================================
# 11. PROPOSED TECHNOLOGIES
# =========================================================================
h1('11. Proposed Technologies')
p('The following technologies are used to build and deploy the system. They were selected to match the team\u2019s skills and to support the performance, security, and scalability requirements of the project.')

techs = [
    ('Component', 'Technology'),
    ('Front End', 'Next.js 16 (React), TypeScript, Tailwind CSS v4'),
    ('Back End', 'Next.js Server Actions and Route Handlers (Node.js runtime)'),
    ('Database', 'Supabase (PostgreSQL) with Row-Level Security'),
    ('Authentication', 'Supabase Auth (email/password, cookie-based sessions)'),
    ('AI / Chatbot', 'Cloudflare Workers AI (retrieval-augmented knowledge base)'),
    ('API', 'REST API and Route Handlers (Next.js /api routes)'),
    ('Version Control', 'Git / GitHub'),
    ('Development Tool', 'Visual Studio Code'),
    ('Testing', 'Vitest (unit) and Playwright (end-to-end)'),
    ('Deployment', 'Cloudflare Workers (via vinext and Wrangler)'),
]
t2 = doc.add_table(rows=len(techs), cols=2)
t2.style = 'Table Grid'
for i, (a, b) in enumerate(techs):
    t2.rows[i].cells[0].text = a
    t2.rows[i].cells[1].text = b

p('')
p('The technologies are appropriate to the project requirements: Next.js and TypeScript provide a modern, strictly typed full-stack web framework; Supabase provides a secure, relational database with built-in authentication and Row-Level Security; and Cloudflare Workers provides a scalable global edge deployment with an integrated AI service for the assistant.')
# =========================================================================
# 12. SOFTWARE TESTING PLAN
# =========================================================================
h1('12. Software Testing Plan')
p('The software testing plan explains how the team will verify that the system works correctly, securely, and reliably before it is released. It covers the following levels of testing:')
h3('Unit Testing')
p('Individual functions and modules are tested in isolation. For example, the login and authentication module is unit-tested to verify that passwords are validated, sessions are created, and invalid credentials are rejected. Helper functions such as duplicate detection, ticket-number generation, and requirements-validation logic are also unit-tested independently of the database.')
h3('Integration Testing')
p('Interactions between modules are tested to verify that they work together correctly. For example, integration testing determines whether authentication properly interacts with the user profile and session database, whether ticket submission correctly writes to the tickets table and generates a ticket number, and whether the AI assistant correctly retrieves only published knowledge-base articles.')
h3('System Testing')
p('The complete system is tested end to end to verify that all modules perform their intended functions together within the deployed environment, including the request-to-resolution lifecycle, staff queue operations, reporting, import/export, and archiving.')
h3('Usability Testing')
p('The interface is tested with representative users from the UPHSD community to confirm that students and employees can easily register, submit a request, track its status, and rate a completed service, and that IT staff find the queue and ticket management workflow intuitive.')
h3('Security Testing')
p('The system is tested to verify role-based access control and Row-Level Security: unauthorized users cannot view or modify other users\u2019 tickets, self-service profile updates cannot escalate privileges, and no secrets are exposed to the client. The AI assistant is tested for per-user rate limiting and for not exposing internal or cross-user data.')
h3('User Acceptance Testing (UAT)')
p('Representative end users \u2014 students, employees, and IT staff \u2014 validate the system against the documented requirements to confirm that it meets their needs and expectations before final acceptance.')
p('Example: The login module will undergo unit testing to verify authentication functions. Integration testing will determine whether authentication properly interacts with the user database and session handling. User acceptance testing will be conducted with representative users to confirm that the overall submission and tracking workflow is easy, secure, and meets the needs of the UPHSD IT Department.', bold=True)

out = 'System Integration - Title Proposal (Improved).docx'
doc.save(out)
print('SAVED:', out)