{
  "targets": [
    {
      "target_name": "winAPI",
      "sources":["winAPI.cc"],
    },
    {
      "target_name": "darwinAPI",
      "sources":["darwinAPI.cc"]
    }
  ],
  'conditions': [
          ['OS=="linux"', {
            'defines': [
              'LINUX_DEFINE',
            ],
          }],
          ['OS=="win"', {
            'defines': [
              'WINDOWS_SPECIFIC_DEFINE',
            ],
          }
        ],
          ['OS=="mac"', {
            'defines': [
              'MAC_DEFINE',
            ],
          }
        ]
      ]
}