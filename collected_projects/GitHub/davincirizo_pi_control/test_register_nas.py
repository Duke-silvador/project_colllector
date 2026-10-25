import unittest
from register_nas import merge


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.config = {'mode':'real', 'ssh':{'identity_file':'local-key'}, 'servers':[
            {'id':'server1','lan_ip':'10.0.0.127','mac_address':'e4:54:e8:60:23:5e','actions_enabled':True}]}
        self.nas = {'id':'nas-server','lan_ip':'10.0.0.224','mac_address':'00:e0:4c:79:95:e5','actions_enabled':True}

    def test_preserves_config_and_does_not_mutate_input(self):
        updated = merge(self.config, self.nas)
        self.assertEqual(len(self.config['servers']), 1)
        self.assertEqual(updated['servers'][0], self.config['servers'][0])
        self.assertEqual(updated['ssh'], self.config['ssh'])
        self.assertEqual(updated['servers'][1], self.nas)

    def test_repeat_is_idempotent(self):
        updated = merge(self.config, self.nas)
        self.assertEqual(merge(updated, self.nas), updated)

    def test_conflicting_id_or_network_identity_is_rejected(self):
        for change in ({'id':'server1'}, {'lan_ip':'10.0.0.127'}, {'mac_address':'E4:54:E8:60:23:5E'}):
            with self.assertRaises(ValueError):
                merge(self.config, dict(self.nas, **change))

    def test_simulation_cannot_be_modified(self):
        with self.assertRaises(ValueError):
            merge(dict(self.config, mode='simulation'), self.nas)
