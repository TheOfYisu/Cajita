Pod::Spec.new do |s|
  s.name           = 'cajita-cloud-sync'
  s.version        = '1.0.0'
  s.summary        = 'Cajita iCloud backup transport'
  s.description    = 'Sube/baja el backup cifrado de cajita.db al contenedor iCloud de la cuenta del usuario.'
  s.author         = 'Cajita'
  s.homepage       = 'https://github.com/'
  s.license        = 'GPL-3.0'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,swift}"
end