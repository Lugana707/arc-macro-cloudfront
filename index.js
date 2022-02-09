/**
 * Architect serverless framework macro that creates a CloudFront distribution for your S3 bucket
 *
 * @param {object} arc - Parsed `app.arc` value
 * @param {object} sam - Generated CloudFormation template
 * @param {string} stage - Deployment target runtime environment 'staging' or 'production'
 * @returns {object} Modified CloudFormation template
 */
module.exports = async function cloudfront(arc, sam, stage = "staging") {
  if (!arc.static) {
    console.warn("No static S3 bucket configured!");

    return sam;
  }

  if (!arc.cloudfront) {
    console.warn(
      "No Cloudfront configuration available! Please add @cloudfront to your arc config file."
    );

    return sam;
  }

  const generateCustomErrorResponse = ({ path, code }) => {
    if (!path) {
      return null;
    }

    return {
      ErrorCachingMinTTL: 60,
      ErrorCode: code,
      ResponseCode: code,
      ResponsePagePath: path
    };
  };

  const { pageDefault, page403, page404 } = arc.cloudfront;

  // https://github.com/aws-samples/amazon-cloudfront-secure-static-site/blob/master/templates/cloudfront-site.yaml

  // S3 Bucket Policy
  const s3BucketPolicy = {
    Type: "WS::S3::BucketPolicy",
    Properties: {
      Bucket: null,
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["s3:GetObject"],
            Effect: "Allow",
            Resource: null,
            Principal: { CanonicalUser: null }
          }
        ]
      }
    }
  };

  // CloudFront Distribution
  const cloudFrontDistribution = {
    Type: "AWS::CloudFront::Distribution",
    Properties: {
      DistributionConfig: {
        Aliases: null,
        Comment: null,
        CustomErrorResponses: [
          generateCustomErrorResponse({ path: page403, code: 403 }),
          generateCustomErrorResponse({ path: page404, code: 404 })
        ].filter(Boolean),
        CustomOrigin: null,
        DefaultCacheBehavior: {
          Compress: true,
          DefaultTTL: 86400,
          ForwardedValues: {
            QueryString: true
          },
          MaxTTL: 31536000,
          TargetOriginId: null,
          ViewerProtocolPolicy: "redirect-to-https",
          ResponseHeadersPolicyId: null
        },
        DefaultRootObject: pageDefault,
        Enabled: true,
        HttpVersion: "http2",
        IPV6Enabled: true,
        Logging: null,
        Origins: null,
        PriceClass: "PriceClass_All",
        ViewerCertificate: null
      },
      Tags: [...arc.s3.Properties.Tags]
    }
  };

  // CloudFront Origin Access Identity
  const cloudFrontOriginAccessIdentity = {
    Type: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
    Properties: {
      CloudFrontOriginAccessIdentityConfig: {
        Comment: null
      }
    }
  };

  if (
    sam.Resources.s3BucketPolicy ||
    sam.Resources.cloudFrontDistribution ||
    sam.Resources.cloudFrontOriginAccessIdentity
  ) {
    console.error(
      "Cannot create resources in CloudFormation - names already in use!",
      { s3BucketPolicy, cloudFrontDistribution, cloudFrontOriginAccessIdentity }
    );

    return sam;
  }

  sam.Resources.S3BucketPolicy = s3BucketPolicy;
  sam.Resources.CloudFrontDistribution = cloudFrontDistribution;
  sam.Resources.CloudFrontOriginAccessIdentity = cloudFrontOriginAccessIdentity;

  return sam;
};
