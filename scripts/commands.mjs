export default [
	{
		"default_member_permissions": 8194,
		"dm_permission": false,
		"type": 1,
		"name": "support",
		"description": "Toggles your support role."
	},
	{
		"default_member_permissions": 8194,
		"dm_permission": false,
		"type": 1,
		"name": "lock",
		"description": "Locks/Unlocks the support server."
	},
	{
		"default_member_permissions": 0,
		"dm_permission": false,
		"type": 1,
		"name": "translation-status",
		"description": "Shows you the progress of translating Benny"
	},
	{
		"default_member_permissions": 8194,
		"dm_permission": false,
		"type": 1,
		"name": "timeout",
		"description": "Times out a member",
		"options": [
			{
				"type": 6,
				"name": "user",
				"description": "User to timeout",
				"required": true
			},
			{
				"type": 3,
				"name": "time",
				"description": "The duration to timeout for (0 to remove)",
				"required": true
			},
			{
				"type": 3,
				"name": "reason",
				"description": "Audit log reason"
			}
		]
	},
	{
		"default_member_permissions": 0,
		"type": 1,
		"name": "status",
		"description": "Displays Benny's status"
	}
]