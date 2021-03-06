import {Injectable} from '@angular/core';
import {OAuthService} from 'angular-oauth2-oidc';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {ConfigService} from './config.service';
import {IProfile} from '../model/profile';
import {AuthInitOptions} from '../model/auth-init-options';
import {IPractitioner} from '../model/practitioner';
import {IOAuthConfig} from '../model/oauth-config';

@Injectable()
export class AuthService {
  private readonly OAUTH_URIS_EXT_URL = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';
  private initialized = false;
  public token: string;
  public user: IProfile;
  public fhirBase: string;
  public lastUrl: string;

  constructor(
      public oauthService: OAuthService,
      private http: HttpClient,
      private router: Router,
      private configService: ConfigService,
      private activatedRoute: ActivatedRoute) {
  }

  async initLocal(config: IOAuthConfig) {
    if (this.initialized) return;

    this.oauthService.setStorage(localStorage);
    this.oauthService.configure({
      issuer: config.issuer,
      redirectUri: window.location.origin + '/',
      useSilentRefresh: true,
      clientId: config.clientId,
      responseType: 'code',
      scope: config.scope,
      showDebugInformation: false,
      requestAccessToken: true,
      requireHttps: false
    });

    await this.oauthService.loadDiscoveryDocument();
    this.initialized = true;
  }

  async loginLocal() {
    await this.initLocal(this.configService.config.oauth);

    // Has the user already authenticated via Smart-on-FHIR?
    if (!this.user) {
      const loggedIn: boolean = await this.oauthService.tryLogin();

      try {
        if (loggedIn) {
          this.user = await this.oauthService.loadUserProfile() as any;
        }
      } catch (ex) {
        console.log(`Error loading user profile: ${ex.message}`);
      }

      // Force the user to login locally if they have not already logged-in via smart-on-fhir
      if (!this.user) {
        this.oauthService.initImplicitFlow(encodeURIComponent(this.router.url));
      } else {
        console.log('Your token is: ' + this.token);
        await this.oauthService.setupAutomaticSilentRefresh();

        this.token = this.oauthService.getIdToken();

        let path;
        if (!this.oauthService.state || this.oauthService.state !== 'undefined') {
          path = unescape(decodeURIComponent(this.oauthService.state));
        } else {
          path = this.activatedRoute.snapshot.queryParams.pathname || `/generate`;
        }

        if (path && path !== '/') {
          this.router.navigate([path]);
        }
      }
    }
  }

  private convertFhirUserToProfile(fhirUser: IPractitioner): IProfile {
    const profile = <IProfile>{};

    if (fhirUser.name && fhirUser.name.length > 0) {
      const name = fhirUser.name[0];

      if (name.family && name.given && name.given.length > 0) {
        profile.name = name.given.join(', ') + ' ' + name.family;
      } else if (name.family) {
        profile.name = name.family;
      } else if (name.given && name.given.length > 0) {
        profile.name = name.given.join(', ');
      } else {
        profile.name = 'Unknown';
      }
    }

    if (fhirUser.telecom) {
      const email = fhirUser.telecom.find(t => t.system === 'email');

      if (email && email.value) {
        if (email.value.startsWith('mailto:')) {
          profile.email = email.value.substring(7);
        } else {
          profile.email = email.value;
        }
      }
    }

    return profile;
  }

  public logout() {
    this.oauthService.logOut();
    this.user = null;
  }
}
