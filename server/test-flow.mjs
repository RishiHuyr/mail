import fetch from 'node:http';

async function testApi() {
  const baseUrl = 'http://localhost:5000/api';

  console.log('--- Testing MailFlow API Endpoints ---');

  // Helper fetch function
  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const res = await globalThis.fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Health check
  const health = await request('/health');
  console.log('1. Health check:', health.status === 200 ? 'PASS ✅' : 'FAIL ❌', health.data);

  // 2. Auth status
  const authStatus = await request('/auth/status');
  console.log('2. Auth status:', authStatus.status === 200 ? 'PASS ✅' : 'FAIL ❌', authStatus.data);

  // 3. Settings get
  const settings = await request('/settings');
  console.log('3. Settings GET:', settings.status === 200 ? 'PASS ✅' : 'FAIL ❌', settings.data);

  // 4. Contacts creation
  const contact = await request('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dr. Jane Foster',
      email: `jane.foster.${Date.now()}@astrophysics.org`,
      company: 'Asgard Observatories',
      role: 'Principal Researcher',
    }),
  });
  console.log('4. Create contact:', contact.status === 201 ? 'PASS ✅' : 'FAIL ❌', contact.data?.name);

  // 5. Contacts listing
  const contactsList = await request('/contacts');
  console.log('5. List contacts count:', contactsList.data?.total >= 1 ? 'PASS ✅' : 'FAIL ❌', contactsList.data?.total);

  // 6. CSV Parsing
  const sampleCsv = 'Name,Email,Company,Role\r\n' +
    'Bruce Wayne,bruce@wayneenterprises.com,Wayne Enterprises,CEO\r\n' +
    'Clark Kent,clark@dailyplanet.com,Daily Planet,Senior Reporter\r\n' +
    'Diana Prince,diana@themyscira.gov,Themyscira Embassy,Ambassador\r\n' +
    'Bruce Wayne,bruce@wayneenterprises.com,Wayne Enterprises,CEO\r\n'; // duplicate test!

  const parsed = await request('/csv/parse', {
    method: 'POST',
    body: JSON.stringify({ content: sampleCsv }),
  });
  console.log('6. CSV Parse & Duplicate Detection:', 
    parsed.data?.duplicateCount === 1 && parsed.data?.validCount === 3 ? 'PASS ✅' : 'FAIL ❌', 
    `Valid: ${parsed.data?.validCount}, Duplicates: ${parsed.data?.duplicateCount}`
  );

  // 7. Toggle Simulation Mode for safe test sending
  const sim = await request('/auth/toggle-simulation', { method: 'POST' });
  console.log('7. Simulation mode active:', sim.data?.simulationMode ? 'PASS ✅' : 'FAIL ❌');

  // 8. Create Campaign with dynamic variables and queue
  const campaign = await request('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Outreach Automation',
      subject: 'Special invitation for {{Name}} at {{Company}}',
      body_html: '<p>Hi {{Name}},</p><p>We would love to discuss {{Role}} opportunities at {{Company}}.</p>',
      delay_seconds: 1,
      recipients: [
        { name: 'Bruce Wayne', email: 'bruce@wayneenterprises.com', company: 'Wayne Enterprises' },
        { name: 'Diana Prince', email: 'diana@themyscira.gov', company: 'Themyscira Embassy' }
      ],
      autoStart: true,
    }),
  });
  console.log('8. Create and Start Campaign:', campaign.status === 201 ? 'PASS ✅' : 'FAIL ❌', campaign.data?.id);

  // 9. Wait 3 seconds for background worker to process queue
  console.log('   Waiting 3s for background queue processing...');
  await new Promise(r => setTimeout(r, 3000));

  // 10. Check campaign detail and logs
  const campaignDetail = await request(`/campaigns/${campaign.data?.id}`);
  console.log('10. Campaign Sent Progress:', 
    campaignDetail.data?.campaign?.sent_count === 2 ? 'PASS ✅' : 'FAIL ❌',
    `Sent: ${campaignDetail.data?.campaign?.sent_count}/${campaignDetail.data?.campaign?.total_recipients}, Status: ${campaignDetail.data?.campaign?.status}`
  );

  // 11. Check recipient logs
  const recLogs = campaignDetail.data?.recipients;
  console.log('11. Recipient Logs length and statuses:',
    recLogs?.length === 2 && recLogs.every(r => r.status === 'sent') ? 'PASS ✅' : 'FAIL ❌',
    recLogs?.map(r => `${r.name}: ${r.status}`).join(', ')
  );

  // 12. Dashboard Stats
  const stats = await request('/stats');
  console.log('12. Dashboard Stats aggregation:',
    stats.data?.emailsSent >= 2 && stats.data?.totalCampaigns >= 1 ? 'PASS ✅' : 'FAIL ❌',
    `Total Sent: ${stats.data?.emailsSent}, Total Campaigns: ${stats.data?.totalCampaigns}`
  );

  console.log('--- ALL TEST RUNS COMPLETE ---');
}

testApi().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

