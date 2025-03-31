
            /// Returns the `rustc` SemVer version and additional metadata
            /// like the git short hash and build date.
            pub fn version_meta() -> VersionMeta {
                VersionMeta {
                    semver: Version {
                        major: 1,
                        minor: 85,
                        patch: 1,
                        pre: vec![],
                        build: vec![],
                    },
                    host: "x86_64-pc-windows-msvc".to_owned(),
                    short_version_string: "rustc 1.85.1 (4eb161250 2025-03-15)".to_owned(),
                    commit_hash: Some("4eb161250e340c8f48f66e2b929ef4a5bed7c181".to_owned()),
                    commit_date: Some("2025-03-15".to_owned()),
                    build_date: None,
                    channel: Channel::Stable,
                }
            }
            