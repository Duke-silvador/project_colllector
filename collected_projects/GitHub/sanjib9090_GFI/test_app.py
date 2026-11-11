import json
import os
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch, Mock
from docx import Document
import app as module

class FlaskResumeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'APP_DATA_DIR': self.temp.name, 'STORAGE_BACKEND': 'local'}, clear=True)
        self.env.start()
        self.offline = patch('app.requests.get', side_effect=module.requests.RequestException('offline'))
        self.offline.start()
        module._CACHE = None
        self.client = module.app.test_client()
        self.data = self.client.get('/api/candidates').get_json()
        self.version = self.data['analysis_version']
    def tearDown(self):
        self.offline.stop(); self.env.stop(); self.temp.cleanup(); module._CACHE = None
    def upload(self, name, content):
        return self.client.post('/api/upload', data={'file': (BytesIO(content), name), 'analysis_version': self.version}, content_type='multipart/form-data')
    def test_supplied_and_fallback(self):
        supplied = json.loads((module.ROOT / 'data' / 'resumes.json').read_text())
        self.assertEqual(len(self.data['candidates']), len(supplied))
        for role in self.data['roles'].values():
            self.assertEqual(role['jd']['source'],'snapshot')
            self.assertTrue(role['jd']['warning'])
            self.assertTrue(role['requirements'])
            self.assertTrue(all(x['jdEvidence'] for x in role['rules']))
    def test_sections_partial_evidence_and_persistence(self):
        text=('PROFILE SUMMARY:\nDeveloper.\nEDUCATION:\nMCA | University\nTECHNICAL SKILLS:\nReact, HTML, CSS\nPROJECTS:\n• Designed responsive UI for an application.\n• Collaborated with the backend team.\nACHIEVEMENT:\nTeam lead.\n').encode()
        response=self.upload('candidate.txt',text); self.assertEqual(response.status_code,200)
        item=response.get_json(); self.assertEqual(item['sectionStatus']['experience'],'missing')
        for section in ('education','skills','projects'): self.assertEqual(item['sectionStatus'][section],'labeled');self.assertTrue(item['sections'][section])
        self.assertFalse(any('Team lead' in line for line in item['sections']['projects']))
        criteria={c['label']:c for c in item['results']['design']['criteria']}
        self.assertEqual(criteria['UI/UX or human-centered design']['points'],10)
        self.assertEqual(criteria['UI/UX or human-centered design']['matchType'],'partial')
        self.assertEqual(criteria['Figma']['points'],0)
        self.assertEqual(criteria['User research or testing']['points'],0)
        self.assertEqual(criteria['Relevant design project evidence']['points'],5)
        self.assertEqual(criteria['Cross-functional collaboration']['points'],5)
        stored=Path(self.temp.name) / item['file_key'];self.assertEqual(stored.read_bytes(),text)
        view=self.client.get('/api/resumes/'+item['id']+'/file');self.assertEqual(view.data,text)
        self.assertEqual(len(self.client.get('/api/candidates').get_json()['candidates']),len(self.data['candidates']) + 1)
        self.assertEqual(self.client.delete('/api/resumes/'+item['id']).status_code,200)
        self.assertEqual(self.client.get('/api/resumes/'+item['id']+'/file').status_code,404)
        self.assertFalse(stored.exists())
    def test_direct_supplied_links_and_unknown_source(self):
        root = Path(self.temp.name) / 'fixture'
        data_dir = root / 'data'
        data_dir.mkdir(parents=True)
        filename = 'anonymized_NP_1793682784325.docx'
        known_link = 'https://workdrive.zohoexternal.in/writer/zwpreview/nychee1f7a1cd8c6246cfa0ae019fcfacf690?printbutton=true'
        entries = [{'id': filename, 'filename': filename, 'origin': 'supplied', 'text': '', 'error': None},
                   {'id': 'unknown.docx', 'filename': 'unknown.docx', 'origin': 'supplied', 'text': '', 'error': None}]
        (data_dir / 'resumes.json').write_text(json.dumps(entries))
        (data_dir / 'resume_links.json').write_text((module.ROOT / 'data' / 'resume_links.json').read_text())
        with patch('app.ROOT', root):
            response = self.client.get('/api/candidates')
        self.assertEqual(response.status_code, 200)
        items = response.get_json()['candidates']
        self.assertEqual(items[0]['source_url'], known_link)
        self.assertIsNone(items[1]['source_url'])
        links = json.loads((module.ROOT / 'data' / 'resume_links.json').read_text())
        self.assertEqual(len(links), 47)
        self.assertEqual(len(set(links.values())), 47)

    def test_docx_and_inline_headings(self):
        doc=Document();doc.add_paragraph('Work Experience');doc.add_paragraph('LCA consultant 2022–2025');doc.add_paragraph('Skills & Tools: SimaPro, GaBi');doc.add_paragraph('Education: MSc Environmental Engineering')
        buf=BytesIO();doc.save(buf)
        r=self.upload('candidate.docx',buf.getvalue());self.assertEqual(r.status_code,200)
        data=r.get_json();self.assertTrue(data['sections']['experience']);self.assertIn('SimaPro',data['sections']['skills'][0]);self.assertTrue(data['sections']['education'])
    def test_ma_lca_experience_from_dated_roles(self):
        from datetime import date
        role = module.load_config()['lca']
        rule = next(r for r in role['rules'] if r.get('years_points'))
        lines = ['SENIOR LIFE CYCLE ASSESSMENT ANALYST', 'Future Green Solutions', '2016 - Present',
                 'Led life cycle assessments for key product lines.', 'LIFE CYCLE ASSESSMENT CONSULTANT',
                 'EcoWise Consulting', '2014 - 2016', 'Conducted assessments for various industries.']
        estimate = module.estimate_experience(lines, rule['experience_role_patterns'], today=date(2026,11,7))
        self.assertAlmostEqual(estimate['years'], (12*12 + 10 + 6/31)/12)
        self.assertEqual(len(estimate['evidence']), 2)
        roles, _ = module.job_context()
        result = module.evaluate({'text': 'EDUCATION\nMaster of Science 2010 - 2014\nEXPERIENCE\n' + '\n'.join(lines), 'error': None}, roles)
        criterion = next(c for c in result['results']['lca']['criteria'] if c['label'] == rule['label'])
        self.assertEqual(criterion['points'], 10)
        self.assertIn('Estimated', criterion['note'])
        self.assertIn('independent', criterion['note'])
        self.assertEqual(len(criterion['evidence']), 2)

    def test_experience_dates_do_not_count_unrelated_or_overlapping(self):
        from datetime import date
        rules = module.load_config()['lca']['rules']
        rule = next(r for r in rules if r.get('years_points'))
        patterns = rule['experience_role_patterns']
        self.assertIsNone(module.estimate_experience(['PRODUCT MANAGER', 'Company', '2014 - Present'], patterns, today=date(2026,11,7)))
        self.assertIsNone(module.estimate_experience(['LCA CONSULTANT', 'PRODUCT MANAGER', '2014 - Present'], patterns, rule['generic_role_pattern'], today=date(2026,11,7)))
        self.assertIsNone(module.estimate_experience(['LCA CONSULTANT', '2030 - 2031'], patterns, today=date(2026,11,7)))
        estimate = module.estimate_experience(['LCA CONSULTANT', 'Jan 2020 - Dec 2021', 'LCA ANALYST', 'Jan 2021 - Dec 2022'], patterns, today=date(2026,11,7))
        self.assertEqual(estimate['years'], 3)
        roles, _ = module.job_context()
        c = module.evaluate({'text':'EDUCATION\nLCA ANALYST\n2014 - 2022\nEXPERIENCE\nPRODUCT MANAGER\n2015 - 2022', 'error':None}, roles)
        self.assertEqual(next(x for x in c['results']['lca']['criteria'] if x['label'] == 'LCA experience (claimed or estimated)')['points'], 0)

    def test_np_numeric_dates_lca_duties_and_incomplete_iso(self):
        from datetime import date
        roles, _ = module.job_context()
        rule = next(r for r in roles['lca']['rules'] if r.get('years_points'))
        source = {'text': 'Experience\nSenior Engineer – R&D — Gunnebo India Pvt. Ltd. 09/2024 – Current\nConducted LCA using OpenLCA.\nUpskill Trainee – R&D — Gunnebo India Pvt. Ltd. 09/2023 – 09/2024\nDesigned systems.\nCertifications & Licenses\nIntegrated LCA – ISO :2006\n', 'error': None}
        sections, _ = module.extract_sections(source['text'])
        estimate = module.estimate_experience(sections['experience'], rule['experience_role_patterns'], rule['generic_role_pattern'], rule['experience_duty_patterns'], date(2026,11,7))
        self.assertAlmostEqual(estimate['years'], (26 + 6/31)/12)
        self.assertEqual(len(estimate['evidence']), 2)
        self.assertIn('Conducted LCA', estimate['evidence'][1])
        result = module.evaluate(source, roles)
        criteria = {c['label']:c for c in result['results']['lca']['criteria']}
        self.assertEqual(criteria['LCA experience (claimed or estimated)']['points'], 6)
        self.assertEqual(result['lcaExperience']['kind'], 'estimated')
        self.assertGreaterEqual(result['lcaExperience']['years'], 2)
        self.assertIn('09/2024', result['lcaExperience']['evidence'][0])
        iso = criteria['ISO 14040 / 14044']
        self.assertEqual(iso['points'], 0)
        self.assertEqual(iso['matchType'], 'review')
        self.assertIn('standard number is missing', iso['note'])
        self.assertIn('ISO :2006', iso['evidence'][0])
        claim = module.evaluate({'text':'PROFILE SUMMARY\nLCA experience: 5 years', 'error':None}, roles)
        self.assertEqual(claim['lcaExperience']['kind'], 'claimed')
        self.assertEqual(claim['lcaExperience']['years'], 5)
        explicit = module.evaluate({'text':'CERTIFICATIONS\nISO 14040:2006', 'error':None}, roles)
        self.assertEqual(next(c for c in explicit['results']['lca']['criteria'] if c['label'] == 'ISO 14040 / 14044')['points'], 10)

    def test_duties_do_not_bleed_between_job_blocks(self):
        from datetime import date
        r = next(r for r in module.load_config()['lca']['rules'] if r.get('years_points'))
        lines = ['Senior Engineer 01/2020 – 12/2021', 'Designed machines.', 'Product Manager 01/2022 – 12/2023', 'Conducted LCA study.']
        result = module.estimate_experience(lines, r['experience_role_patterns'], r['generic_role_pattern'], r['experience_duty_patterns'], date(2026,11,7))
        self.assertEqual(result['years'], 2)
        self.assertNotIn('Senior Engineer', ' '.join(result['evidence']))
        self.assertIsNone(module.estimate_experience(['Senior Engineer 01/2020 – 12/2021', 'Worked on product design.'], r['experience_role_patterns'], r['generic_role_pattern'], r['experience_duty_patterns'], date(2026,11,7)))

    def test_pw_project_associate_lca_and_total_experience(self):
        from datetime import date
        roles, _ = module.job_context()
        source = {'text': 'Experience\nProject Associate 1 — CSIR NEERI June 2024 – Present\nWorking on MRIO modelling with hybridisation of LCA.\nEnglish Content Writer — Freelancer Aug 2020 - Jan 2024\nWrote content.\nGraduate Internship Trainee — Chemcepts March 2021 - Feb 2022\nConducted process simulation.\n', 'error': None}
        sections, _ = module.extract_sections(source['text'])
        jobs = module.find_jobs(sections['experience'], date(2026,11,7))
        relevant = module.aggregate_jobs(jobs, roles['lca']['experience_title_patterns'], roles['lca']['experience_duty_patterns'], date(2026,11,7))
        total = module.aggregate_jobs(jobs, today=date(2026,11,7), all_roles=True)
        self.assertAlmostEqual(relevant['years'], (29 + 6/31)/12)
        self.assertIn('Project Associate', relevant['evidence'][0])
        self.assertIn('LCA', relevant['evidence'][1])
        self.assertGreater(total['years'], relevant['years'])
        c = module.evaluate(source, roles)
        self.assertIsNotNone(c['experienceByRole']['lca'])
        self.assertEqual(next(x for x in c['results']['lca']['criteria'] if x['label']=='LCA experience (claimed or estimated)')['points'], 6)

    def test_design_and_general_experience_formats(self):
        from datetime import date
        roles, _ = module.job_context()
        design = roles['design']
        date_now = date(2026,11,7)
        text = ['Product Designer — Studio Jan 26 - April 26', 'Created wireframes.', 'UX Design Intern — Company 8 Months']
        jobs = module.find_jobs(text, date_now)
        result = module.aggregate_jobs(jobs, design['experience_title_patterns'], design['experience_duty_patterns'], date_now)
        self.assertAlmostEqual(result['years'], 4/12)
        self.assertTrue(result['duration_only_omitted'])
        duration = module.aggregate_jobs(module.find_jobs(text[2:], date_now), design['experience_title_patterns'], design['experience_duty_patterns'], date_now)
        self.assertEqual(duration['kind'], 'claimed')
        self.assertAlmostEqual(duration['years'], 8/12)
        self.assertIsNone(module._parse_range('Product Designer 20 - 25', date_now))
        self.assertIsNotNone(module._parse_range('App Developer Intern Jun – Jul 2024', date_now))

    def test_undated_new_job_duties_do_not_bleed(self):
        from datetime import date
        roles = module.load_config()
        lines = ['Engineer — A 2020 - 2021', 'Managed production.', 'Project Associate — B', 'Performed LCA study.']
        jobs = module.find_jobs(lines,date(2026,11,7))
        self.assertIsNone(module.aggregate_jobs(jobs, roles['lca']['experience_title_patterns'], roles['lca']['experience_duty_patterns'], date(2026,11,7)))

    def test_total_explicit_claim_when_no_dates(self):
        roles, _ = module.job_context()
        result = module.evaluate({'text': 'PROFILE SUMMARY\n3 years of R&D engineering experience.', 'error': None}, roles)
        self.assertEqual(result['totalExperience']['kind'], 'claimed')
        self.assertEqual(result['totalExperience']['years'], 3)
        self.assertIsNone(result['experienceByRole']['lca'])
        self.assertIsNone(module.explicit_total_claim(['Age 30 years', 'Experience in Figma']))

    def test_txt_variants(self):
        for name,data in [('resume.md','EDUCATION:\nMaster\n'.encode('utf-16')),('resume.rtf',b'{\\rtf1\\ansi EDUCATION:\\par Master\\par}'),('resume.html',b'<h1>EDUCATION:</h1><p>Master</p><script>never show</script>')]:
            extracted=module.extract_file(name,data);self.assertIn('EDUCATION',extracted);self.assertNotIn('never show',extracted)
    def test_bad_file(self):
        self.assertEqual(self.upload('bad.docx',b'broken').status_code,400)
        self.assertEqual(self.upload('old.doc',b'legacy').status_code,400)
    def test_version_consistency(self):
        r=self.client.post('/api/upload',data={'file':(BytesIO(b'test'),'new.txt'),'analysis_version':'old'},content_type='multipart/form-data')
        self.assertEqual(r.status_code,409)
    def test_json_config_and_captured_jd(self):
        role=module.load_config()['lca'];snapshot=json.loads((module.ROOT/'data'/'jd_lca.json').read_text());
        import html
        html_text='<h1>'+html.escape(snapshot['title'])+'</h1><div class="tally-text">'+''.join('<div>'+html.escape(x)+'</div>' for x in snapshot['lines'])+'</div>'
        response=Mock(status_code=200);response.iter_content.return_value=[html_text.encode()];response.__enter__=Mock(return_value=response);response.__exit__=Mock(return_value=False)
        with patch('app.requests.get',return_value=response):
            live=module.fetch_job('lca',role)
        self.assertEqual(live['source'],'live');saved=Path(self.temp.name)/'jds/lca.json';self.assertTrue(saved.is_file());self.assertEqual(json.loads(saved.read_text())['title'],live['title'])
    def test_inferred_and_uncertain(self):
        sections,status=module.extract_sections('Candidate has skills in Python and Figma.\nMCA at University.\nExperience in full-stack development.');self.assertEqual(status['skills'],'inferred');self.assertEqual(status['education'],'inferred');self.assertEqual(status['experience'],'inferred')
        roles,_=module.job_context();self.assertEqual(module.evaluate({'text':'','error':'No text'},roles)['classification'],'Uncertain')
    def test_cloud_requires_persistent_storage_not_login(self):
        with patch.dict(os.environ, {'VERCEL':'1'}, clear=True):
            self.assertEqual(self.client.get('/api/candidates').status_code, 503)
        with patch.dict(os.environ, {'VERCEL':'1','STORAGE_BACKEND':'local'}, clear=True):
            response = self.client.get('/api/candidates')
            self.assertEqual(response.status_code, 503)
            self.assertNotEqual(response.status_code, 401)
    def test_blob_backend_calls(self):
        with patch.dict(os.environ,{'STORAGE_BACKEND':'blob','BLOB_READ_WRITE_TOKEN':'test'},clear=True):
            with patch('vercel.blob.sync.put_blob') as put, patch('vercel.blob.sync.get_blob',return_value=Mock(body=b'abc')),patch('vercel.blob.sync.query_blobs',return_value=iter([Mock(pathname='records/x.json')])),patch('vercel.blob.sync.delete_blob') as delete:
                module.storage_put('resumes/abc.pdf',b'abc');self.assertEqual(module.storage_get('resumes/abc.pdf'),b'abc');self.assertEqual(module.storage_list('records/'),['records/x.json']);module.storage_delete('resumes/abc.pdf')
                self.assertEqual(put.call_args.kwargs['access'],'private');delete.assert_called_once()
if __name__=='__main__': unittest.main()
