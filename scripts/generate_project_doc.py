#!/usr/bin/env python3
"""
Gmark IoT Official Project Documentation Generator
Generates clean, 3-page, GramUnnati-formatted documentation in HTML and PDF formats.
"""

import subprocess
import sys
import os

DOC_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Gmark IoT - Project Information Documentation</title>
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 20mm 18mm 20mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1a1a1a;
    background: #ffffff;
    font-size: 9.5pt;
    line-height: 1.45;
  }

  .page-break {
    page-break-before: always;
  }

  .doc-title {
    text-align: center;
    font-size: 24pt;
    font-weight: bold;
    color: #176b3a;
    margin-bottom: 18px;
    letter-spacing: -0.3px;
  }

  .section {
    margin-bottom: 14px;
  }

  .section-heading {
    font-size: 13.5pt;
    font-weight: bold;
    color: #176b3a;
    margin-bottom: 6px;
  }

  .section-p {
    font-size: 9.4pt;
    line-height: 1.48;
    color: #222222;
    text-align: justify;
    margin-bottom: 6px;
  }

  .sub-heading {
    font-size: 10.5pt;
    font-weight: bold;
    color: #1a1a1a;
    margin-top: 8px;
    margin-bottom: 4px;
  }

  ul.bullet-list {
    list-style-type: disc;
    padding-left: 20px;
    margin-bottom: 8px;
  }

  ul.bullet-list li {
    font-size: 9.3pt;
    line-height: 1.44;
    color: #222222;
    margin-bottom: 4px;
  }

  ul.values-list {
    list-style-type: disc;
    padding-left: 20px;
    margin-bottom: 8px;
  }

  ul.values-list li {
    font-size: 9.3pt;
    line-height: 1.46;
    color: #222222;
    margin-bottom: 6px;
  }

  ul.values-list strong {
    color: #111111;
  }

  /* Table styling */
  table.system-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    margin-bottom: 12px;
  }

  table.system-table th {
    font-style: italic;
    font-weight: bold;
    color: #1a1a1a;
    text-align: left;
    padding: 6px 14px 6px 0;
    border-bottom: 1px solid #1a1a1a;
    font-size: 10pt;
  }

  table.system-table th.col-area {
    width: 27%;
  }

  table.system-table th.col-purpose {
    width: 73%;
    padding-right: 0;
  }

  table.system-table td {
    padding: 6.5px 14px 6.5px 0;
    vertical-align: top;
    font-size: 9.2pt;
    line-height: 1.42;
    color: #222222;
  }

  table.system-table td.col-area {
    font-weight: 500;
    color: #111111;
  }

  table.system-table td.col-purpose {
    padding-right: 0;
  }
</style>
</head>
<body>

  <!-- PAGE 1 -->
  <div>
    <div class="doc-title">Gmark IoT</div>

    <!-- 1. Problem Statement -->
    <div class="section">
      <div class="section-heading">1.&nbsp;&nbsp;&nbsp;&nbsp;Problem Statement</div>
      <p class="section-p">
        Commercial facilities, residential societies, and industrial plants face severe operational bottlenecks due to unmonitored equipment, manual meter readings, delayed fault detection, and fragmented asset records. Critical systems such as hydro-pneumatic (HYPN) pressure boosters, sump drainage pumps, sewage treatment plants, and emergency fire sprinkler panels frequently encounter unnoticed pressure drops, cavitation, dry runs, electrical overload, and pump burnouts. Without centralized cloud supervisory monitoring and structured 4M (Man, Machine, Material, Method) governance, organizations suffer from high energy and water wastage, unplanned downtime, costly asset damage, and lack of auditable maintenance records.
      </p>
    </div>

    <!-- 2. Our Solution -->
    <div class="section">
      <div class="section-heading">2.&nbsp;&nbsp;&nbsp;&nbsp;Our Solution</div>
      <p class="section-p">
        Gmark IoT provides a comprehensive Industrial IoT (IIoT) SCADA automation and 4M asset management platform. It seamlessly connects field hardware controllers (PLCs, AIPCU controllers, Modbus devices) with modern cloud supervisory software. Gmark IoT delivers real-time machine telemetry (delivery/suction line pressure, flow rates, frequency, runtime hours, operational status), animated process flow diagrams, automated threshold alerts with audio sirens, preventive maintenance scheduling, automated equipment code sequencing, and granular role-based access control.
      </p>
    </div>

    <!-- 3. Project Overview -->
    <div class="section">
      <div class="section-heading">3. Project Overview</div>
      <p class="section-p">
        <strong>Gmark IoT</strong> is an all-in-one industrial automation and asset governance platform tailored for commercial facilities, industrial plants, and residential societies. It connects physical hardware controllers with digital supervisory control. The system features an interactive SCADA dashboard with live animated pipe networks and pump units, a centralized multi-tenant facility hierarchy (Main Facility, Sub-Facility, Tower Building), automated equipment code sequencing, and platform-wide configuration management.
      </p>
    </div>

    <!-- 4. Goals -->
    <div class="section">
      <div class="section-heading">4. Goals</div>
      
      <div class="sub-heading">Facility & Plant Managers</div>
      <ul class="bullet-list">
        <li>Provide real-time remote visibility and supervisory control over critical pumps, motors, and fire panels.</li>
        <li>Prevent catastrophic equipment failures and utility supply interruptions through predictive threshold alarms.</li>
        <li>Increase operational efficiency, uptime, and energy savings with automated runtime telemetry.</li>
        <li>Establish a centralized, cloud-accessible digital twin of multi-facility operations.</li>
      </ul>

      <div class="sub-heading">Maintenance Teams & Engineers</div>
      <ul class="bullet-list">
        <li>Streamline equipment maintenance workflows, spare parts management, and AMC service agreements.</li>
        <li>Standardize asset tracking with automated, non-duplicating Machine and Asset sequence coding.</li>
        <li>Receive instant audible sirens and visual badge notifications for pump trips, overload, and dry-run faults.</li>
        <li>Eliminate error-prone manual physical logbooks with automated time-series telemetry recording.</li>
      </ul>

      <div class="sub-heading">Societies & Commercial Enterprises</div>
      <ul class="bullet-list">
        <li>Guarantee 24/7 unhindered domestic water supply and emergency fire-readiness across residential towers.</li>
        <li>Accurately allocate operational expenses, power bills, and maintenance costs to designated Cost Centers.</li>
        <li>Enforce strict operational security through Role-Based Access Control, ensuring authorized personnel access only assigned devices.</li>
        <li>Extend equipment lifespan and reduce capital expenditure by proactively maintaining optimal operating parameters.</li>
      </ul>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page-break">
    <!-- 5. Vision -->
    <div class="section">
      <div class="section-heading">5. Vision</div>
      <p class="section-p">
        To pioneer intelligent, zero-downtime industrial and facility automation by transforming physical machines into transparent, connected digital assets—ensuring safety, sustainability, and operational peace of mind for communities and enterprises worldwide.
      </p>
    </div>

    <!-- 6. Our Values -->
    <div class="section">
      <div class="section-heading">6. Our Values</div>
      <ul class="values-list">
        <li><strong>Empowerment:</strong> Enable facility managers, engineers, and operators to make data-driven maintenance decisions through modern digital tools.</li>
        <li><strong>Reliability:</strong> Ensure uncompromised 24/7 continuous operation and fail-safe monitoring for mission-critical water and fire networks.</li>
        <li><strong>Transparency:</strong> Build operational trust through instantaneous, verified sensor telemetry and tamper-proof event logs.</li>
        <li><strong>Sustainability:</strong> Promote environmentally responsible utility management by reducing energy wastage and conserving water.</li>
        <li><strong>Technology for Good:</strong> Make complex industrial IoT technology simple, visual, and accessible for everyday operators and staff.</li>
        <li><strong>Community Safety:</strong> Guarantee round-the-clock emergency fire readiness, pressure stabilization, and automated trip protection.</li>
        <li><strong>Scalable Innovation:</strong> Build open, modular IoT architectures capable of effortlessly scaling from single pump sets to nationwide industrial hubs.</li>
      </ul>
    </div>

    <!-- 7. What the System Does -->
    <div class="section">
      <div class="section-heading">7. What the System Does</div>
      <table class="system-table">
        <thead>
          <tr>
            <th class="col-area">Area</th>
            <th class="col-purpose">Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-area">Live SCADA Monitoring</td>
            <td class="col-purpose">Real-time visual monitoring of pump systems, suction/delivery pressures, line frequencies, and run hours with animated flow indicators.</td>
          </tr>
          <tr>
            <td class="col-area">4M Machine Master</td>
            <td class="col-purpose">Register, track, and manage machine profiles, auto-generated sequence codes (MCH, AST), specifications, and parent-child location hierarchies.</td>
          </tr>
          <tr>
            <td class="col-area">Facility Hierarchy</td>
            <td class="col-purpose">Multi-level geographical organization connecting Main Facilities, Sub-Facilities, Societies, and Tower Buildings.</td>
          </tr>
          <tr>
            <td class="col-area">Threshold & Alert Engine</td>
            <td class="col-purpose">Monitors configurable high/low setpoints on PLC registers and triggers real-time audio alarms, visual warning badges, and acknowledgement logs.</td>
          </tr>
          <tr>
            <td class="col-area">Interactive Process Flow</td>
            <td class="col-purpose">Dynamic, animated SVG schematic diagrams representing physical booster stations, valves, pipes, and pump units in real time.</td>
          </tr>
          <tr>
            <td class="col-area">User & Role Governance</td>
            <td class="col-purpose">Strict Role-Based Access Control (RBAC) with customizable permissions across Super Admin, Society Admin, Building Admin, Operator, and Viewer.</td>
          </tr>
          <tr>
            <td class="col-area">Employee Management</td>
            <td class="col-purpose">Centralized staff master tracking employee codes (EMP), designations, contact records, and machine ownership assignments.</td>
          </tr>
          <tr>
            <td class="col-area">Historical Data & Analytics</td>
            <td class="col-purpose">Time-series logging of device register metrics, pressure trends, runtime histories, and exportable operational audit logs.</td>
          </tr>
          <tr>
            <td class="col-area">IoT Hardware Connectivity</td>
            <td class="col-purpose">High-throughput telemetry ingestion supporting MQTT message brokers and industrial Modbus TCP/RTU protocol controllers.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PAGE 3 -->
  <div class="page-break">
    <!-- 8. Platform Ecosystem -->
    <div class="section">
      <div class="section-heading">8. Platform Ecosystem</div>
      <ul class="values-list">
        <li><strong>Central Cloud SCADA Web Portal –</strong> an interactive web application for facility managers and administrators to view live plant schematics, monitor telemetry, and supervise multi-site infrastructure.</li>
        <li><strong>4M Industrial Asset Suite –</strong> a centralized administrative module managing machines, locations, maintenance heads, cost centers, specifications, and warranty contracts.</li>
        <li><strong>Edge IoT Telemetry Broker –</strong> a robust message broker handling bi-directional MQTT data packets and register sync between field controllers and the cloud.</li>
        <li><strong>Role-Based Operations Console –</strong> tailored user views empowering society administrators, field engineers, and building operators with dedicated action menus.</li>
      </ul>
    </div>

    <!-- 9. Key Features -->
    <div class="section">
      <div class="section-heading">9. Key Features</div>
      <ul class="bullet-list">
        <li>Live Animated SCADA Process Flow Diagrams</li>
        <li>Real-time Multi-line Pressure & Flow Monitoring</li>
        <li>Dynamic Pump Status Indicators (Auto / Manual / Run / Trip / Standby)</li>
        <li>Multi-tier Threshold Alarms with Real-time Audio Alerts</li>
        <li>Automated Machine & Asset Code Sequencing (MCH / AST)</li>
        <li>Multi-level Geographical Facility & Building Hierarchy</li>
        <li>4M Machine Master with Technical Specification & Nameplate Capture</li>
        <li>Cost Center & Departmental Financial Budget Allocation</li>
        <li>Employee Master with Role Assignments & Ownership Linking</li>
        <li>Granular Role-Based Access Control (RBAC)</li>
        <li>Time-Series Sensor Analytics & Historical Logging</li>
        <li>Industrial MQTT & Modbus Controller Protocol Integration</li>
      </ul>
    </div>
  </div>

</body>
</html>
"""

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    docs_dir = os.path.join(base_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    
    html_path = os.path.join(docs_dir, "Gmark_IoT_Project_Documentation.html")
    pdf_path = os.path.join(docs_dir, "Gmark_IoT_Project_Documentation.pdf")
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(DOC_HTML)
    print(f"HTML written to {html_path}")
    
    cmd = [
        "google-chrome",
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file://{html_path}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"PDF successfully generated at {pdf_path}")
    else:
        print(f"Error generating PDF: {res.stderr}", file=sys.stderr)

if __name__ == "__main__":
    main()
